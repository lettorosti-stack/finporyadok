$ErrorActionPreference = 'Stop'

$projectPath = 'C:\Users\User\Documents\приложение для семейного бюджета'
Set-Location $projectPath

$duplicatePath = Join-Path $projectPath 'finance-icons'
if (Test-Path $duplicatePath) {
    Remove-Item $duplicatePath -Recurse -Force
    Write-Host 'Лишняя папка finance-icons удалена с компьютера.' -ForegroundColor Green
} else {
    Write-Host 'Папка finance-icons уже отсутствует.' -ForegroundColor Yellow
}

if (-not (Test-Path (Join-Path $projectPath '.git'))) {
    throw 'В этой папке не найден Git-репозиторий. Сначала откройте правильную папку проекта.'
}

git rm -r --ignore-unmatch finance-icons
if ($LASTEXITCODE -ne 0) { throw 'Не удалось подготовить удаление finance-icons из Git.' }

git add .gitignore
if ($LASTEXITCODE -ne 0) { throw 'Не удалось добавить .gitignore.' }

$changes = git status --porcelain
if (-not $changes) {
    Write-Host 'В GitHub уже нет лишней папки — отправлять нечего.' -ForegroundColor Yellow
    exit 0
}

git commit -m 'Remove unused duplicate finance-icons folder'
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать commit.' }

git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Не удалось отправить изменения в GitHub.' }

Write-Host 'Лишняя папка удалена локально и из GitHub.' -ForegroundColor Green
