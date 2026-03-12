# Как запустить ML сервис

## Быстрый запуск (с видимыми логами)

**Рекомендуемый способ для отладки:**

1. Двойной клик по файлу: `start_ml_visible.bat`
2. Откроется новое окно PowerShell с логами ML сервиса
3. Все запросы и ошибки будут видны в этом окне

## Альтернативные способы запуска

### Вариант 1: Через PowerShell (с видимыми логами)
```powershell
cd "d:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
.\start_ml_visible.ps1
```

### Вариант 2: Через обычный скрипт (без окна)
```powershell
.\start_ml_service.ps1
```

### Вариант 3: Прямой запуск Python
```powershell
cd "d:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
& "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe" simple_ml.py
```

## Проверка работы сервиса

После запуска проверьте:

1. **Health check:**
   ```powershell
   curl http://localhost:8000/health
   ```
   Должно вернуть: `{"status":"healthy","database":"connected"}`

2. **Информация о сервисе:**
   ```powershell
   curl http://localhost:8000/
   ```

3. **Проверка порта:**
   ```powershell
   netstat -ano | findstr ":8000"
   ```

## Остановка сервиса

1. Если запущен через `start_ml_visible.bat` - закройте окно PowerShell или нажмите Ctrl+C
2. Если запущен в фоне - найдите процесс и остановите:
   ```powershell
   # Найти процесс
   netstat -ano | findstr ":8000"
   
   # Остановить (замените PID на номер процесса)
   Stop-Process -Id PID -Force
   ```

## Доступные эндпоинты

После запуска доступны по адресу `http://localhost:8000`:

- `POST /api/analyze-thought` - Анализ мысли с ML
- `POST /api/generate-report` - Генерация еженедельного отчета
- `POST /api/upload-voice` - Загрузка и транскрипция голоса
- `GET /api/mind-score` - Получение mind score пользователя
- `GET /health` - Проверка здоровья сервиса

## Устранение проблем

### Порт 8000 занят
```powershell
# Найти процесс на порту 8000
netstat -ano | findstr ":8000"
# Остановить процесс (замените 12345 на реальный PID)
Stop-Process -Id 12345 -Force
```

### Ошибки подключения к БД
Проверьте `config.env`:
```
DATABASE_URL=postgresql://aura:aura@localhost:5432/aura
```

### Проблемы с зависимостями
```powershell
cd "d:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
& "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe" -m pip install -r requirements.txt
```

## Что исправлено

✅ **Проблема с кодировкой Unicode** - заменены символы ✓/✗ на [OK]/[ERROR]
✅ **Видимые логи** - добавлен запуск в отдельном окне PowerShell
✅ **Стабильный запуск** - используется Python 3.11 по фиксированному пути
