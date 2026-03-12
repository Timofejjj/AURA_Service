# PowerShell script to start ML service
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting ML Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ML directory (relative to script or absolute)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mlDir = if (Test-Path (Join-Path $scriptDir "ml_part")) { Join-Path $scriptDir "ml_part" } else { $scriptDir }
Set-Location $mlDir

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Python: prefer Python 3.11 from project .bat, then py -3, then python
$pythonExe = $null
if (Test-Path "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe") {
    $pythonExe = "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe"
}
if (-not $pythonExe) {
    try { $null = Get-Command py -ErrorAction Stop; $pythonExe = "py -3" } catch { }
}
if (-not $pythonExe) {
    try { $null = Get-Command python -ErrorAction Stop; $pythonExe = "python" } catch { }
}
if (-not $pythonExe) {
    Write-Host "ERROR: Python not found! Install Python 3.11 or add to PATH." -ForegroundColor Red
    exit 1
}

Write-Host "`nChecking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = if ($pythonExe -match " ") { Invoke-Expression "$pythonExe --version 2>&1" } else { & $pythonExe --version 2>&1 }
    Write-Host "Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python failed: $_" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow
$checkCmd = if ($pythonExe -match " ") { $pythonExe + ' -c "import fastapi; import uvicorn; import psycopg2; print(''All dependencies OK'')"' } else { "$pythonExe -c `"import fastapi; import uvicorn; import psycopg2; print('All dependencies OK')`"" }
try {
    $out = if ($pythonExe -match " ") { Invoke-Expression $checkCmd 2>&1 } else { & $pythonExe -c "import fastapi; import uvicorn; import psycopg2; print('All dependencies OK')" 2>&1 }
    if ($LASTEXITCODE -ne 0) { throw "Dependencies check failed" }
    Write-Host "Dependencies OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Dependencies not installed!" -ForegroundColor Red
    Write-Host "Run: pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Check config.env
Write-Host "`nChecking config.env..." -ForegroundColor Yellow
if (Test-Path "config.env") {
    Write-Host "config.env found" -ForegroundColor Green
} else {
    Write-Host "WARNING: config.env not found!" -ForegroundColor Yellow
}

# Start ML service
Write-Host "`nStarting ML Service on port 8000..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($pythonExe -match " ") {
    Invoke-Expression "$pythonExe simple_ml.py"
} else {
    & $pythonExe simple_ml.py
}

