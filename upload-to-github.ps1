param(
    [string]$Owner = "lettorosti-stack",
    [string]$Repo = "finporyadok",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoFull = "$Owner/$Repo"

Write-Host "Uploading project to GitHub repository: $repoFull ($Branch)" -ForegroundColor Cyan
Write-Host "The token is used only for this upload and is not saved." -ForegroundColor DarkGray
Write-Host "Paste the token only in this PowerShell window. Do not send it to chat." -ForegroundColor Yellow

$token = Read-Host "Paste GitHub token with repo and workflow permissions"

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Token is empty."
}

$token = ($token -replace '[\x00-\x1F\x7F]', '').Trim()

$headers = @{
    Authorization          = "Bearer $token"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$excludeDirs = @(
    ".git",
    ".agents",
    ".codex",
    ".gradle",
    "build",
    "app/build",
    "app/src/main/assets/www",
    "Новая папка",
    "finporyadok_codex_package"
)

$excludeFiles = @(
    "finporyadok-github-upload.zip"
)

function Convert-ToRepoPath([string]$fullPath) {
    $rootFull = [IO.Path]::GetFullPath($root).TrimEnd('\', '/')
    $pathFull = [IO.Path]::GetFullPath($fullPath)
    if (-not $pathFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside project folder: $fullPath"
    }
    $relative = $pathFull.Substring($rootFull.Length).TrimStart('\', '/')
    return ($relative -replace "\\", "/")
}

function Test-IsExcluded([string]$fullPath) {
    $repoPath = Convert-ToRepoPath $fullPath
    foreach ($dir in $excludeDirs) {
        if ($repoPath -eq $dir -or $repoPath.StartsWith("$dir/")) {
            return $true
        }
    }
    foreach ($file in $excludeFiles) {
        if ($repoPath -eq $file) {
            return $true
        }
    }
    return $false
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

    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body $json -ContentType "application/json; charset=utf-8"
}

function Get-ExistingSha([string]$repoPath) {
    $encodedPath = [uri]::EscapeDataString($repoPath).Replace("%2F", "/")
    $uri = "https://api.github.com/repos/$repoFull/contents/$encodedPath" + "?ref=$Branch"
    try {
        $existing = Invoke-GitHubJson -Method "GET" -Uri $uri
        return $existing.sha
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404) {
            return $null
        }
        throw
    }
}

$files = Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object { -not (Test-IsExcluded $_.FullName) } |
    Sort-Object FullName

if (-not $files.Count) {
    throw "No files found to upload."
}

Write-Host "Files to upload: $($files.Count)" -ForegroundColor Cyan

$uploaded = 0
foreach ($file in $files) {
    $repoPath = Convert-ToRepoPath $file.FullName
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $content = [Convert]::ToBase64String($bytes)
    $sha = Get-ExistingSha $repoPath

    $body = @{
        message = "Upload $repoPath"
        content = $content
        branch  = $Branch
    }
    if ($sha) {
        $body.sha = $sha
    }

    $encodedPath = [uri]::EscapeDataString($repoPath).Replace("%2F", "/")
    $uri = "https://api.github.com/repos/$repoFull/contents/$encodedPath"
    Invoke-GitHubJson -Method "PUT" -Uri $uri -Body $body | Out-Null

    $uploaded += 1
    Write-Host "[$uploaded/$($files.Count)] $repoPath" -ForegroundColor Green
}

Write-Host "Done. Open https://github.com/$repoFull/actions to build APK." -ForegroundColor Cyan
