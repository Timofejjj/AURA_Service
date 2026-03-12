@echo off
cd /d "D:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
title ML Service - Port 8000
color 0A
echo.
echo ========================================
echo   ML Service Starting...
echo ========================================
echo.
echo Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python or add it to PATH
    pause
    exit /b 1
)
echo.
echo Starting ML Service on http://localhost:8000
echo.
echo ========================================
echo.
python simple_ml.py
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

