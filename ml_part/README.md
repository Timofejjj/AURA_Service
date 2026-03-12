# Aura App - ML Service Setup

## Текущий статус

### ✅ Работающие компоненты:
- **PostgreSQL** (порт 5432)
- **Backend API** (порт 8080) - Go
- **Frontend** (порт 5173) - React + Vite

### ⚠️ ML Service (порт 8000) - требует настройки

## Быстрый запуск

### Вариант 1: Запуск всего приложения
```powershell
.\start_all.ps1
```

### Вариант 2: Запуск ML отдельно
```cmd
cd ml_part
diagnose_and_start.bat
```

## Настройка ML Service

### Шаг 1: Проверьте зависимости Python
```cmd
cd ml_part
pip install -r requirements.txt
```

### Шаг 2: Проверьте подключение к БД
```cmd
cd ml_part
python -c "from db_provider import DatabaseDataProvider; db = DatabaseDataProvider(); print('OK'); db.close()"
```

### Шаг 3: Запустите ML сервис
```cmd
cd ml_part
python simple_ml.py
```

Если видите ошибки - проверьте:
1. PostgreSQL запущен (порт 5432)
2. Файл `config.env` существует
3. В `config.env` правильная строка подключения:
   ```
   DATABASE_URL=postgresql://aura:aura@localhost:5432/aura
   ```

## Файлы ML сервиса

- `simple_ml.py` - упрощенная версия (для тестирования)
- `app.py` - полная версия с роутами
- `main_logic.py` - основная логика ML анализа
- `routes.py` - API эндпоинты
- `db_provider.py` - работа с БД
- `config.env` - конфигурация (API ключи, БД)

## API Endpoints

После запуска ML сервиса доступны:

- `GET /` - проверка работы
- `GET /health` - статус здоровья
- `POST /api/analyze-thought` - анализ мысли
- `POST /api/generate-report` - генерация отчета
- `POST /api/upload-voice` - загрузка голоса
- `GET /api/mind-score?user_id=X` - получить mind score

## Функциональность ML

### Работает (когда ML запущен):
- ✅ Анализ sentiment (positive/negative/neutral)
- ✅ Определение категории мысли (type_thought)
- ✅ Расчет mind_score
- ✅ Транскрипция голоса (AssemblyAI)
- ✅ Генерация отчетов (Gemini AI)

### Зависимости:
- Google Gemini API (ключ в config.env)
- AssemblyAI API (ключ в config.env)
- PostgreSQL
- Python 3.11+

## Troubleshooting

### ML сервис не запускается

1. **Проверьте Python:**
   ```cmd
   python --version
   ```
   Должен быть Python 3.11 или выше

2. **Проверьте зависимости:**
   ```cmd
   pip list | findstr "fastapi uvicorn psycopg2"
   ```

3. **Проверьте PostgreSQL:**
   ```cmd
   netstat -ano | findstr ":5432"
   ```

4. **Посмотрите логи:**
   Запустите `diagnose_and_start.bat` и посмотрите на вывод ошибок

### Приложение работает без ML

Даже если ML сервис не запущен, основное приложение работает:
- Регистрация и вход
- Сохранение мыслей
- Просмотр профиля

Но не работает:
- Анализ настроения мыслей
- Автоматическая категоризация
- Расчет энергии (mind score)

## Контакты и поддержка

Если ML сервис не запускается, проверьте окно CMD - там будет детальная диагностика проблемы.

