@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ML Service - Starting...
color 0A

echo.
echo ========================================
echo   ML Service Launcher
echo ========================================
echo.
echo Starting ML Service in a new window...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0start_ml_visible.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start ML Service!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ML Service window opened!
echo ========================================
echo.
echo Check the new PowerShell window for logs.
echo The window will show all ML service output.
echo.
echo Press any key to close this launcher window...
pause >nul
