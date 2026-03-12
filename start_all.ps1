# ========================================
#  Aura App - Complete Startup Script
# ========================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Aura Application Startup" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# [1/5] Check Docker/PostgreSQL
Write-Host "[1/5] Checking PostgreSQL..." -ForegroundColor Cyan
$pgRunning = netstat -ano | findstr ":5432 " | Select-Object -First 1
if ($pgRunning) {
    Write-Host "  PostgreSQL already running" -ForegroundColor Green
} else {
    Write-Host "  Starting PostgreSQL (Docker)..." -ForegroundColor Yellow
    try {
        docker start aura-postgres 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Docker not available - start PostgreSQL manually" -ForegroundColor Yellow
        } else {
            Start-Sleep -Seconds 3
        }
    } catch {
        Write-Host "  Start PostgreSQL manually" -ForegroundColor Yellow
    }
}

# [2/5] Start Backend (Go)
Write-Host "`n[2/5] Starting Backend API..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== Backend API (Go) ===' -ForegroundColor Green; go run ./cmd/api"
Write-Host "  Backend starting at http://localhost:8080" -ForegroundColor White
Start-Sleep -Seconds 3

# [3/5] Start ML Service (Python) - visible PowerShell window with logs
Write-Host "`n[3/5] Starting ML Service..." -ForegroundColor Cyan
$mlPath = Join-Path $PSScriptRoot "ml_part"
$mlVisibleScript = Join-Path $mlPath "start_ml_visible.ps1"
if (Test-Path $mlVisibleScript) {
    & powershell -ExecutionPolicy Bypass -File $mlVisibleScript
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mlPath'; & 'C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe' simple_ml.py"
}
Write-Host "  ML Service starting at http://localhost:8000" -ForegroundColor White
Write-Host "  (Check the new PowerShell window for ML logs)" -ForegroundColor Yellow
Start-Sleep -Seconds 3

# [4/5] Start Frontend (Vite + React)
Write-Host "`n[4/5] Starting Frontend..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== Frontend (Vite) ===' -ForegroundColor Green; npm run dev"
Write-Host "  Frontend starting at http://localhost:5173" -ForegroundColor White

# [5/5] Wait and check status
Write-Host "`n[5/5] Waiting for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SERVICE STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$pg = netstat -ano | findstr ":5432 " | Select-Object -First 1
$be = netstat -ano | findstr ":8080 " | Select-Object -First 1
$ml = netstat -ano | findstr ":8000 " | Select-Object -First 1
$fe = netstat -ano | findstr ":5173 " | Select-Object -First 1

if ($pg) { Write-Host "  [OK] PostgreSQL (5432)" -ForegroundColor Green } else { Write-Host "  [FAIL] PostgreSQL (5432)" -ForegroundColor Red }
if ($be) { Write-Host "  [OK] Backend (8080)" -ForegroundColor Green } else { Write-Host "  [WARN] Backend (8080) - starting..." -ForegroundColor Yellow }
if ($ml) { Write-Host "  [OK] ML Service (8000)" -ForegroundColor Green } else { Write-Host "  [WARN] ML Service (8000) - check CMD window" -ForegroundColor Yellow }
if ($fe) { Write-Host "  [OK] Frontend (5173)" -ForegroundColor Green } else { Write-Host "  [WARN] Frontend (5173) - starting..." -ForegroundColor Yellow }

Write-Host "`n========================================" -ForegroundColor Cyan

if ($pg -and $be -and $fe) {
    Write-Host "`n  Application is ready!" -ForegroundColor Green
    Write-Host "`n  Open: http://localhost:5173" -ForegroundColor Yellow
    Write-Host "`n  Features working:" -ForegroundColor Cyan
    Write-Host "    - Registration & Login" -ForegroundColor White
    Write-Host "    - Thought saving" -ForegroundColor White
    Write-Host "    - User profile" -ForegroundColor White
    if ($ml) {
        Write-Host "    - ML Analysis (thought categorization)" -ForegroundColor White
        Write-Host "    - Mind score calculation" -ForegroundColor White
    } else {
        Write-Host "    - ML Analysis (not available)" -ForegroundColor Gray
    }
} else {
    Write-Host "`n  Some services failed to start" -ForegroundColor Yellow
    Write-Host "  Check the terminal windows for errors" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
