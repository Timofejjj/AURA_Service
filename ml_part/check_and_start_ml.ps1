# Comprehensive ML Service Check and Start Script
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ML Service Diagnostic and Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$mlDir = "D:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
Set-Location $mlDir

# 1. Check Python
Write-Host "`n[1/5] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found!" -ForegroundColor Red
    Write-Host "  Please install Python or add it to PATH" -ForegroundColor Yellow
    exit 1
}

# 2. Check dependencies
Write-Host "`n[2/5] Checking dependencies..." -ForegroundColor Yellow
$missing = @()
$deps = @("fastapi", "uvicorn", "psycopg2", "requests", "python-dotenv")
foreach ($dep in $deps) {
    try {
        python -c "import $dep" 2>&1 | Out-Null
        Write-Host "  ✓ $dep" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $dep missing" -ForegroundColor Red
        $missing += $dep
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n  Installing missing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# 3. Check config.env
Write-Host "`n[3/5] Checking config.env..." -ForegroundColor Yellow
if (Test-Path "config.env") {
    Write-Host "  ✓ config.env found" -ForegroundColor Green
} else {
    Write-Host "  ✗ config.env not found!" -ForegroundColor Red
    exit 1
}

# 4. Check database connection
Write-Host "`n[4/5] Checking database connection..." -ForegroundColor Yellow
try {
    python -c "from db_provider import DatabaseDataProvider; db = DatabaseDataProvider(); print('  ✓ Database connection OK'); db.close_connection()" 2>&1
    Write-Host "  ✓ Database accessible" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Database connection failed!" -ForegroundColor Red
    Write-Host "  Check if PostgreSQL is running and config.env is correct" -ForegroundColor Yellow
}

# 5. Check port 8000
Write-Host "`n[5/5] Checking port 8000..." -ForegroundColor Yellow
$port8000 = netstat -ano | findstr ":8000"
if ($port8000) {
    Write-Host "  ⚠ Port 8000 is already in use:" -ForegroundColor Yellow
    Write-Host $port8000
    Write-Host "  Stopping existing process..." -ForegroundColor Yellow
    $port8000 | ForEach-Object {
        if ($_ -match '\s+(\d+)$') {
            $pid = $matches[1]
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
}

# Start ML service
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Starting ML Service..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

python simple_ml.py

