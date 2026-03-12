@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Запуск Backend, ML и Frontend...
echo После запуска: https://aura-app.tail8dfcfc.ts.net/app.html
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
pause
