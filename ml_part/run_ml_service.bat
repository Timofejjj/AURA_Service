@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ML Service - Port 8000
color 0A

echo.
echo ========================================
echo   ML Service Starting...
echo ========================================
echo.

echo [1/3] Checking Python...
"C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe" --version
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)
echo.

echo [2/3] Checking dependencies...
"C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe" -c "import fastapi; import uvicorn; import psycopg2; print('All dependencies OK')" 2>nul
if errorlevel 1 (
    echo WARNING: Some dependencies may be missing
    echo Run: "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe" -m pip install -r requirements.txt
    echo.
)
echo.

echo [3/3] Starting ML Service on http://localhost:8000
echo.
echo ========================================
echo   === ML Service (Python) ===
echo ========================================
echo.

"C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe" simple_ml.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: ML Service failed to start!
    echo ========================================
    echo.
    echo Common issues:
    echo   1. Dependencies not installed: pip install -r requirements.txt
    echo   2. PostgreSQL not running
    echo   3. Wrong DATABASE_URL in config.env
    echo   4. Port 8000 already in use
    echo.
    pause
)
