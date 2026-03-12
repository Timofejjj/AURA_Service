@echo off
cd /d "D:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
echo Testing Python and imports...
echo.
python -c "print('Python works!')"
echo.
python -c "import fastapi; print('FastAPI OK')"
echo.
python -c "import uvicorn; print('Uvicorn OK')"
echo.
python -c "import psycopg2; print('psycopg2 OK')"
echo.
python -c "from db_provider import DatabaseDataProvider; print('db_provider OK')"
echo.
echo All imports successful! Now starting app.py...
echo.
python app.py
pause

