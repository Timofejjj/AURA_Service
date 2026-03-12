@echo off
REM Запуск Python-скриптов. Использование: run.cmd <скрипт> [аргументы]
set "PY=C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe"
if not exist "%PY%" set "PY=python"
"%PY%" %*
exit /b %ERRORLEVEL%
