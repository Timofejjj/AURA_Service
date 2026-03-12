# ========================================
#  Aura App - Startup with Tailscale Funnel
# ========================================

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Aura Application Startup" -ForegroundColor Green
Write-Host "  with Tailscale Funnel" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Получаем путь к проекту
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

$backendPath = Join-Path $projectRoot "backend"
$mlPath = Join-Path $projectRoot "ml_part"
$frontendPath = Join-Path $projectRoot "frontend"

# [1/5] Check PostgreSQL
Write-Host "[1/5] Checking PostgreSQL..." -ForegroundColor Cyan
$pgRunning = netstat -ano | findstr ":5432 " | Select-Object -First 1
if ($pgRunning) {
    Write-Host "  [OK] PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] PostgreSQL is not running!" -ForegroundColor Red
    Write-Host "  Please start PostgreSQL first" -ForegroundColor Yellow
    exit 1
}

# [2/5] Start Backend (Go)
Write-Host "`n[2/5] Starting Backend API..." -ForegroundColor Cyan
$backendRunning = netstat -ano | findstr ":8080 " | Select-Object -First 1
if ($backendRunning) {
    Write-Host "  [WARN] Backend already running on port 8080" -ForegroundColor Yellow
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== Backend API (Go) ===' -ForegroundColor Green; `$env:CONN_STRING='postgresql://aura:aura@localhost:5432/aura?sslmode=disable'; go run ./cmd/api/main.go"
    Write-Host "  [OK] Backend starting at http://localhost:8080 (see PowerShell window)" -ForegroundColor White
    Start-Sleep -Seconds 3
}

# [3/5] Start ML Service (Python) — в отдельном окне PowerShell
Write-Host "`n[3/5] Starting ML Service..." -ForegroundColor Cyan
$mlRunning = netstat -ano | findstr ":8000 " | Select-Object -First 1
if ($mlRunning) {
    Write-Host "  [WARN] ML Service already running on port 8000" -ForegroundColor Yellow
} else {
    $pythonPath = "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe"
    if (-not (Test-Path $pythonPath)) {
        $pyCmd = Get-Command python -ErrorAction SilentlyContinue
        if ($pyCmd) { $pythonPath = $pyCmd.Source }
    }
    if (-not $pythonPath) {
        Write-Host "  [FAIL] Python not found. Install Python or set path in script." -ForegroundColor Red
    } else {
        $mlCmd = "cd '$mlPath'; `$env:PYTHONIOENCODING='utf-8'; Write-Host '=== ML Service (Python) ===' -ForegroundColor Green; & '$pythonPath' simple_ml.py"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCmd
        Write-Host "  [OK] ML Service starting at http://localhost:8000 (see PowerShell window)" -ForegroundColor White
        Start-Sleep -Seconds 5
    }
}

# [4/5] Start Frontend (Vite + React)
Write-Host "`n[4/5] Starting Frontend..." -ForegroundColor Cyan
$frontendRunning = netstat -ano | findstr ":5173 " | Select-Object -First 1
if ($frontendRunning) {
    Write-Host "  [WARN] Frontend already running on port 5173" -ForegroundColor Yellow
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; `$env:VITE_DISABLE_HMR='1'; Write-Host '=== Frontend (Vite) - HMR off for mobile ===' -ForegroundColor Green; npm run dev"
    Write-Host "  [OK] Frontend starting at http://localhost:5173 (see PowerShell window)" -ForegroundColor White
    Start-Sleep -Seconds 5
}

# [5/5] Setup Tailscale Funnel
Write-Host "`n[5/5] Setting up Tailscale Funnel..." -ForegroundColor Cyan

# Проверяем наличие Tailscale
$tailscalePath = "D:\tailscale.exe"
if (-not (Test-Path $tailscalePath)) {
    # Пробуем найти tailscale в PATH
    $tailscaleCheck = Get-Command tailscale -ErrorAction SilentlyContinue
    if ($tailscaleCheck) {
        $tailscalePath = "tailscale"
    } else {
        Write-Host "  [WARN] Tailscale not found at D:\tailscale.exe" -ForegroundColor Yellow
        Write-Host "  Please install Tailscale or update path in script" -ForegroundColor Yellow
        $tailscalePath = $null
    }
}

if ($tailscalePath) {
    # Устанавливаем hostname
    Write-Host "  Setting hostname to 'aura-app'..." -ForegroundColor White
    & $tailscalePath set --hostname=aura-app 2>&1 | Out-Null
    
    # Запускаем Funnel для frontend (порт 5173)
    Write-Host "  Starting Tailscale Funnel on port 5173..." -ForegroundColor White
    & $tailscalePath funnel --bg 5173 2>&1 | Out-Null
    
    Start-Sleep -Seconds 2
    
    # Проверяем статус
    $funnelStatus = & $tailscalePath funnel status 2>&1
    Write-Host "`n  Tailscale Funnel Status:" -ForegroundColor Cyan
    Write-Host $funnelStatus -ForegroundColor White
    
    Write-Host "`n  [OK] Frontend will be available at:" -ForegroundColor Green
    Write-Host "    https://aura-app.tail8dfcfc.ts.net/app.html" -ForegroundColor Yellow
} else {
    Write-Host "  [WARN] Tailscale Funnel not configured" -ForegroundColor Yellow
    Write-Host "  Frontend available at http://localhost:5173/app.html" -ForegroundColor White
}

# Wait and check status
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SERVICE STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Start-Sleep -Seconds 5

$pg = netstat -ano | findstr ":5432 " | Select-Object -First 1
$be = netstat -ano | findstr ":8080 " | Select-Object -First 1
$ml = netstat -ano | findstr ":8000 " | Select-Object -First 1
$fe = netstat -ano | findstr ":5173 " | Select-Object -First 1

if ($pg) { Write-Host "  [OK] PostgreSQL (5432)" -ForegroundColor Green } else { Write-Host "  [FAIL] PostgreSQL (5432)" -ForegroundColor Red }
if ($be) { Write-Host "  [OK] Backend (8080)" -ForegroundColor Green } else { Write-Host "  [WARN] Backend (8080) - starting..." -ForegroundColor Yellow }
if ($ml) { Write-Host "  [OK] ML Service (8000)" -ForegroundColor Green } else { Write-Host "  [WARN] ML Service (8000) - check window" -ForegroundColor Yellow }
if ($fe) { Write-Host "  [OK] Frontend (5173)" -ForegroundColor Green } else { Write-Host "  [WARN] Frontend (5173) - starting..." -ForegroundColor Yellow }

Write-Host "`n========================================" -ForegroundColor Cyan

if ($pg -and $be -and $fe) {
    Write-Host "`n  [OK] Application is ready!" -ForegroundColor Green
    if ($tailscalePath) {
        Write-Host "`n  Public URL:" -ForegroundColor Cyan
        Write-Host "    https://aura-app.tail8dfcfc.ts.net/app.html" -ForegroundColor Yellow
    }
    Write-Host "`n  Local URL:" -ForegroundColor Cyan
    Write-Host "    http://localhost:5173/app.html" -ForegroundColor Yellow
    Write-Host "`n  Features working:" -ForegroundColor Cyan
    Write-Host "    - Registration and Login" -ForegroundColor White
    Write-Host "    - Thought saving" -ForegroundColor White
    Write-Host "    - User profile" -ForegroundColor White
    if ($ml) {
        Write-Host "    - ML Analysis (thought categorization)" -ForegroundColor White
        Write-Host "    - Mind score calculation" -ForegroundColor White
    } else {
        Write-Host "    - ML Analysis (not available)" -ForegroundColor Gray
    }
} else {
    Write-Host "`n  [WARN] Some services failed to start" -ForegroundColor Yellow
    Write-Host "  Check the terminal windows for errors" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
