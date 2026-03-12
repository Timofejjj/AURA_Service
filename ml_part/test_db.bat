@echo off
cd /d "D:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
echo.
echo Testing database connection...
echo.
python -c "from db_provider import DatabaseDataProvider; db = DatabaseDataProvider(); print('SUCCESS: DB Connected'); db.close()"
echo.
pause

