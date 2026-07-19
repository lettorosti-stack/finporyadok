param(
    [string]$ProjectPath = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    throw "Project folder not found: $ProjectPath"
}

Set-Location -LiteralPath $ProjectPath

$duplicatePath = Join-Path $ProjectPath 'finance-icons'
if (Test-Path -LiteralPath $duplicatePath) {
    Remove-Item -LiteralPath $duplicatePath -Recurse -Force
    Write-Host 'Removed local finance-icons folder.' -ForegroundColor Green
} else {
    Write-Host 'Local finance-icons folder was not found. Continuing with Git cleanup.' -ForegroundColor Yellow
}

$gitFolder = Join-Path $ProjectPath '.git'
if (-not (Test-Path -LiteralPath $gitFolder)) {
    throw 'This folder is not a Git repository. Run the script from the project root.'
}

$gitIgnorePath = Join-Path $ProjectPath '.gitignore'
$ignoreRule = 'finance-icons/'
if (Test-Path -LiteralPath $gitIgnorePath) {
    $gitIgnoreContent = Get-Content -LiteralPath $gitIgnorePath -Raw
    if ($gitIgnoreContent -notmatch '(?m)^finance-icons/$') {
        Add-Content -LiteralPath $gitIgnorePath -Value "`r`n$ignoreRule"
        Write-Host 'Added finance-icons/ to .gitignore.' -ForegroundColor Green
    }
} else {
    Set-Content -LiteralPath $gitIgnorePath -Value $ignoreRule -Encoding UTF8
    Write-Host 'Created .gitignore with finance-icons/ rule.' -ForegroundColor Green
}

& git rm -r --cached --ignore-unmatch finance-icons
if ($LASTEXITCODE -ne 0) {
    throw 'git rm failed.'
}

& git add .gitignore
if ($LASTEXITCODE -ne 0) {
    throw 'git add failed.'
}

& git status --short

$changes = & git status --porcelain
if (-not $changes) {
    Write-Host 'No Git changes found. Nothing to commit.' -ForegroundColor Yellow
    exit 0
}

& git commit -m "Remove duplicated finance-icons folder"
if ($LASTEXITCODE -ne 0) {
    throw 'git commit failed.'
}

& git push origin main
if ($LASTEXITCODE -ne 0) {
    throw 'git push failed.'
}

Write-Host 'Cleanup completed and pushed to GitHub.' -ForegroundColor Green
