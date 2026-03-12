# PowerShell script to start ML service in a new visible window
$ErrorActionPreference = "Stop"

$mlDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe"

# Check Python exists
if (-not (Test-Path $pythonExe)) {
    Write-Host "ERROR: Python 3.11 not found at $pythonExe" -ForegroundColor Red
    exit 1
}

# Start ML service in a new visible PowerShell window
Write-Host "Starting ML Service in a new window..." -ForegroundColor Cyan
Write-Host "Directory: $mlDir" -ForegroundColor Yellow
Write-Host "Python: $pythonExe" -ForegroundColor Yellow
Write-Host ""

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "& {
        Set-Location '$mlDir'
        Write-Host '======================================' -ForegroundColor Cyan
        Write-Host 'ML Service - Port 8000' -ForegroundColor Cyan
        Write-Host '======================================' -ForegroundColor Cyan
        Write-Host ''
        Write-Host 'Starting ML Service...' -ForegroundColor Yellow
        Write-Host ''
        & '$pythonExe' simple_ml.py
        Write-Host ''
        Write-Host '======================================' -ForegroundColor Red
        Write-Host 'ML Service stopped' -ForegroundColor Red
        Write-Host '======================================' -ForegroundColor Red
    }"
)

Write-Host "[OK] ML Service window opened!" -ForegroundColor Green
Write-Host "Check the new PowerShell window for logs" -ForegroundColor Yellow
