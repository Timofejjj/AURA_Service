@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo =========================================================
echo  ML Service Diagnostic and Startup Script
echo =========================================================
echo.

echo [1/6] Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found in PATH
    echo Please install Python or add it to PATH
    pause
    exit /b 1
)
python --version
echo.

echo [2/6] Checking working directory...
cd
echo.

echo [3/6] Testing Python modules...
python -c "import sys; print(f'Python: {sys.executable}')"
python -c "import fastapi; print('- fastapi: OK')" 2>nul || echo - fastapi: MISSING
python -c "import uvicorn; print('- uvicorn: OK')" 2>nul || echo - uvicorn: MISSING
python -c "import psycopg2; print('- psycopg2: OK')" 2>nul || echo - psycopg2: MISSING
echo.

echo [4/6] Testing database connection...
python -c "from db_provider import DatabaseDataProvider; db = DatabaseDataProvider(); print('- Database: CONNECTED'); db.close()" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo - Database: CONNECTION FAILED
    echo.
    echo ERROR: Cannot connect to database
    echo Check if PostgreSQL is running on localhost:5432
    echo Check config.env file
    pause
    exit /b 1
)
echo.

echo [5/6] Checking if port 8000 is free...
netstat -ano | findstr ":8000 " >nul
if %ERRORLEVEL% EQU 0 (
    echo WARNING: Port 8000 is already in use
    echo Trying to kill existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 "') do taskkill /F /PID %%a >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo - Port 8000: FREE
echo.

echo [6/6] Starting ML Service...
echo.
echo =========================================================
python simple_ml.py
echo.
echo =========================================================
echo ML Service has stopped
pause

