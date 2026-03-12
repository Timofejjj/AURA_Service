@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PYTHON="C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe"

echo.
echo ======================================
echo   Starting ML Service
echo ======================================
echo.
echo Python: %PYTHON%
echo Working Dir: %CD%
echo.
echo Starting simple_ml.py...
echo.

%PYTHON% simple_ml.py

echo.
echo ======================================
echo   ML Service stopped (exit code: %ERRORLEVEL%)
echo ======================================
pause

