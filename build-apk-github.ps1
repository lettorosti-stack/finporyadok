param(
    [string]$Owner = "lettorosti-stack",
    [string]$Repo = "finporyadok",
    [string]$Branch = "main",
    [string]$WorkflowFile = "android-apk.yml",
    [string]$OutputApkName = "finporyadok-0.20.4-release.apk"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoFull = "$Owner/$Repo"
$api = "https://api.github.com/repos/$repoFull"
$startedAt = [DateTimeOffset]::UtcNow.AddMinutes(-2)

Write-Host "Building APK through GitHub Actions for $repoFull ($Branch)" -ForegroundColor Cyan
Write-Host "The token is used only in this PowerShell session and is not saved." -ForegroundColor DarkGray
Write-Host "Token needs repository Contents: Read and write, Actions: Read and write, Workflows: Read and write." -ForegroundColor Yellow

$token = Read-Host "Paste GitHub token"
if ([string]::IsNullOrWhiteSpace($token)) { throw "Token is empty." }
$token = ($token -replace '[\x00-\x1F\x7F]', '').Trim()

$headers = @{
    Authorization          = "Bearer $token"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

function Invoke-GitHubJson {
    param(
        [string]$Method,
        [string]$Uri,
        $Body = $null
    )
    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
    }
    $json = $Body | ConvertTo-Json -Depth 100
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body $json -ContentType "application/json; charset=utf-8"
}

function Convert-ToRepoPath([string]$fullPath) {
    $rootFull = [IO.Path]::GetFullPath($root).TrimEnd('\', '/')
    $pathFull = [IO.Path]::GetFullPath($fullPath)
    if (-not $pathFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside project folder: $fullPath"
    }
    return ($pathFull.Substring($rootFull.Length).TrimStart('\', '/') -replace "\\", "/")
}

$excludeDirPrefixes = @(
    ".git",
    ".agents",
    ".codex",
    ".gradle",
    "build",
    "app/build",
    "app/src/main/assets/www",
    "Новая папка",
    "finporyadok_codex_package",
    "_user_final_baseline_zip",
    "_backup_wrong_version_20260719-restore-before-baseline",
    "tmp-apk-inspect-1784439623393"
)

$excludeFiles = @(
    "finporyadok-github-upload.zip",
    "_restored_mobile_preview.png",
    "_restored_mobile_preview_fixed.png",
    "_polished_mobile_preview.png",
    "_final_mobile_preview.png",
    "_final_mobile_quick_access.png"
)

function Test-IsExcludedRepoPath([string]$repoPath) {
    foreach ($prefix in $excludeDirPrefixes) {
        if ($repoPath -eq $prefix -or $repoPath.StartsWith("$prefix/")) { return $true }
    }
    foreach ($file in $excludeFiles) {
        if ($repoPath -eq $file) { return $true }
    }
    return $false
}

$files = Get-ChildItem -LiteralPath $root -Recurse -File |
    ForEach-Object {
        [PSCustomObject]@{
            FullName = $_.FullName
            RepoPath = Convert-ToRepoPath $_.FullName
        }
    } |
    Where-Object { -not (Test-IsExcludedRepoPath $_.RepoPath) } |
    Sort-Object RepoPath

if (-not $files.Count) { throw "No files found to upload." }

Write-Host "Files in release commit: $($files.Count)" -ForegroundColor Cyan

$ref = Invoke-GitHubJson -Method "GET" -Uri "$api/git/ref/heads/$Branch"
$baseCommitSha = $ref.object.sha
$baseCommit = Invoke-GitHubJson -Method "GET" -Uri "$api/git/commits/$baseCommitSha"
$baseTreeSha = $baseCommit.tree.sha

$tree = New-Object System.Collections.Generic.List[object]
$uploaded = 0
foreach ($file in $files) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $blob = Invoke-GitHubJson -Method "POST" -Uri "$api/git/blobs" -Body @{
        content = [Convert]::ToBase64String($bytes)
        encoding = "base64"
    }
    $tree.Add(@{
        path = $file.RepoPath
        mode = "100644"
        type = "blob"
        sha  = $blob.sha
    }) | Out-Null
    $uploaded += 1
    Write-Host "[$uploaded/$($files.Count)] staged $($file.RepoPath)" -ForegroundColor Green
}

Write-Host "Checking stale files in repository..." -ForegroundColor Cyan
$remoteTree = Invoke-GitHubJson -Method "GET" -Uri "$api/git/trees/$baseTreeSha`?recursive=1"
foreach ($item in $remoteTree.tree) {
    if ($item.type -ne "blob") { continue }
    if (Test-IsExcludedRepoPath $item.path) {
        $tree.Add(@{
            path = $item.path
            mode = "100644"
            type = "blob"
            sha  = $null
        }) | Out-Null
        Write-Host "delete stale $($item.path)" -ForegroundColor DarkYellow
    }
}

$newTree = Invoke-GitHubJson -Method "POST" -Uri "$api/git/trees" -Body @{
    base_tree = $baseTreeSha
    tree = $tree
}

$newCommit = Invoke-GitHubJson -Method "POST" -Uri "$api/git/commits" -Body @{
    message = "Restore full package 13.3 and build release APK"
    tree = $newTree.sha
    parents = @($baseCommitSha)
}

Invoke-GitHubJson -Method "PATCH" -Uri "$api/git/refs/heads/$Branch" -Body @{
    sha = $newCommit.sha
    force = $false
} | Out-Null

Write-Host "Uploaded commit: $($newCommit.sha)" -ForegroundColor Cyan
Start-Sleep -Seconds 8

Write-Host "Starting workflow $WorkflowFile..." -ForegroundColor Cyan
Invoke-GitHubJson -Method "POST" -Uri "$api/actions/workflows/$WorkflowFile/dispatches" -Body @{
    ref = $Branch
} | Out-Null

$run = $null
$deadline = (Get-Date).AddMinutes(35)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    $runs = Invoke-GitHubJson -Method "GET" -Uri "$api/actions/workflows/$WorkflowFile/runs?branch=$Branch&event=workflow_dispatch&per_page=10"
    $run = $runs.workflow_runs |
        Where-Object { ([DateTimeOffset]$_.created_at) -ge $startedAt } |
        Sort-Object created_at -Descending |
        Select-Object -First 1
    if ($null -eq $run) {
        Write-Host "Waiting for workflow run to appear..." -ForegroundColor DarkGray
        continue
    }
    Write-Host "Run #$($run.run_number): $($run.status) / $($run.conclusion)" -ForegroundColor Cyan
    if ($run.status -eq "completed") { break }
}

if ($null -eq $run) { throw "Workflow run was not found." }
if ($run.status -ne "completed") { throw "Workflow did not finish before timeout: $($run.html_url)" }
if ($run.conclusion -ne "success") { throw "Workflow failed: $($run.html_url)" }

$artifacts = Invoke-GitHubJson -Method "GET" -Uri "$api/actions/runs/$($run.id)/artifacts"
$artifact = $artifacts.artifacts |
    Where-Object { $_.expired -eq $false -and ($_.name -match "apk|release") } |
    Select-Object -First 1
if ($null -eq $artifact) { throw "No APK artifact found for run: $($run.html_url)" }

$downloadDir = Join-Path $env:USERPROFILE "Downloads"
$workDir = Join-Path $downloadDir "finporyadok-apk-build"
$zipPath = Join-Path $downloadDir "finporyadok-release-apk.zip"
$apkPath = Join-Path $downloadDir $OutputApkName

if (Test-Path -LiteralPath $workDir) { Remove-Item -LiteralPath $workDir -Recurse -Force }
New-Item -ItemType Directory -Path $workDir | Out-Null

Write-Host "Downloading artifact $($artifact.name)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $artifact.archive_download_url -Headers $headers -OutFile $zipPath
Expand-Archive -LiteralPath $zipPath -DestinationPath $workDir -Force

$apk = Get-ChildItem -LiteralPath $workDir -Recurse -Filter "*.apk" | Select-Object -First 1
if ($null -eq $apk) { throw "Artifact downloaded, but APK was not found: $workDir" }
Copy-Item -LiteralPath $apk.FullName -Destination $apkPath -Force

Write-Host "APK ready:" -ForegroundColor Green
Write-Host $apkPath -ForegroundColor Green
Write-Host "Workflow run: $($run.html_url)" -ForegroundColor Cyan
