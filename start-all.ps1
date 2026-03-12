# Один общий скрипт запуска: Backend + ML + Frontend
# Запуск: PowerShell → .\start-all.ps1  или  правый клик по файлу → «Выполнить с помощью PowerShell»
# Приложение: https://aura-app.tail8dfcfc.ts.net/app.html (локально: http://localhost:5173/app.html)

$ErrorActionPreference = "Continue"
$RootDir = $PSScriptRoot
if (-not $RootDir) { $RootDir = Get-Location }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Aura App — запуск всех сервисов" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend (Go):     http://localhost:8080" -ForegroundColor Gray
Write-Host "  ML (Python):      http://localhost:8000" -ForegroundColor Gray
Write-Host "  Frontend (Vite):  http://localhost:5173" -ForegroundColor Gray
Write-Host "  Приложение:       https://aura-app.tail8dfcfc.ts.net/app.html" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1) Backend (Go)
$backendDir = Join-Path $RootDir "backend"
if (-not (Test-Path $backendDir)) {
    Write-Host "[ERROR] Папка backend не найдена: $backendDir" -ForegroundColor Red
    exit 1
}
Write-Host "[1/3] Запуск Backend (порт 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; Write-Host 'Backend (Go) — порт 8080' -ForegroundColor Green; go run ./cmd/api/main.go"

Start-Sleep -Seconds 2

# 2) ML (Python)
$mlDir = Join-Path $RootDir "ml_part"
if (-not (Test-Path $mlDir)) {
    Write-Host "[ERROR] Папка ml_part не найдена: $mlDir" -ForegroundColor Red
    exit 1
}
$pythonExe = $null
if (Get-Command python -ErrorAction SilentlyContinue) { $pythonExe = "python" }
if (-not $pythonExe -and (Get-Command py -ErrorAction SilentlyContinue)) { $pythonExe = "py -3" }
if (-not $pythonExe) {
    Write-Host "[ERROR] Python не найден. Установите Python 3 и добавьте в PATH." -ForegroundColor Red
    exit 1
}
Write-Host "[2/3] Запуск ML-сервиса (порт 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mlDir'; Write-Host 'ML Service (Python) — порт 8000' -ForegroundColor Green; $pythonExe main_logic.py"

Start-Sleep -Seconds 2

# 3) Frontend (Vite)
$frontendDir = Join-Path $RootDir "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Host "[ERROR] Папка frontend не найдена: $frontendDir" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    Write-Host "[ERROR] В frontend не найден package.json." -ForegroundColor Red
    exit 1
}
Write-Host "[3/3] Запуск Frontend (порт 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; Write-Host 'Frontend (Vite) — порт 5173' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Все сервисы запущены в отдельных окнах." -ForegroundColor Green
Write-Host "Откройте приложение: https://aura-app.tail8dfcfc.ts.net/app.html" -ForegroundColor Cyan
Write-Host "Локально: http://localhost:5173/app.html" -ForegroundColor Cyan
Write-Host ""
