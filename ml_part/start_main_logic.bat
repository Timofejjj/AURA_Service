@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PYTHON="C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe"

echo.
echo ========================================
echo   Starting ML Service (main_logic.py)
echo ========================================
echo.
echo Python: %PYTHON%
echo Working Dir: %CD%
echo.
echo Starting main_logic.py...
echo.

%PYTHON% main_logic.py

echo.
echo ========================================
echo   ML Service stopped (exit code: %ERRORLEVEL%)
echo ========================================
pause

