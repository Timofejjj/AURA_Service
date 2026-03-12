## ML пайплайн: анализ мыслей и отчеты по корреляциям

Этот модуль автоматически:
- Анализирует новые мысли пользователя из БД `thoughts` (по полю `content`) и заполняет:
  - `sentiment_label`: positive | negative | neutral
  - `sentiment_score`: от -1.0 (очень негативно) до 1.0 (очень позитивно), 0.0 — нейтрально
  - `type_thought`: task | plan | retrospective | memories
- Генерирует отчет о том, как данные из таблиц коррелируют между собой по времени, и пишет его в `reports_history.report`.

### Ключевые функции
- `process_new_thoughts(...)` в `ml_part/main_logic.py`
  - Ищет необработанные мысли через `DatabaseDataProvider.get_unprocessed_thoughts(user_id)`
  - Для каждой мысли вызывает `analyze_new_thought(model, content)` (Gemini) и сохраняет анализ через `save_thought_analysis(...)` в `thoughts`.
- `generate_comprehensive_report_with_llm(...)` в `ml_part/main_logic.py`
  - Собирает события по времени из таблиц:
    - `work_sessions`, `breaks`, `sport_activities`, `water_activity`, `coffee_activity`, `eat_activity`, `steps_activity`, `goals_activity`
  - Формирует временную линию и сводную статистику
  - Учитывает «характер отчета» из `ai_prompts_settings.words_for_prompt`
  - Генерирует текст отчета с LLM и сохраняет его в `reports_history.report` через `save_report(...)`
- `run_ml_pipeline(...)`
  - Шаг 1: обрабатывает новые мысли (см. выше)
  - Шаг 2: генерирует отчет по корреляциям данных по времени и сохраняет его

### Где хранятся данные
- Анализ мыслей хранится прямо в таблице `thoughts`:
  - поля: `type_thought`, `sentiment_label`, `sentiment_score`
- Отчеты — в `reports_history`:
  - поля: `user_id`, `log_datetime`, `report`
- Характер отчета — в `ai_prompts_settings.words_for_prompt`

### Настройки окружения
Можно задать в `ml_part/config.env` или через переменные окружения:
- `GEMINI_API_KEY` — ключ доступа к Gemini (LLM)
- `DATABASE_URL` или `CONN_STRING` — строка подключения к PostgreSQL (например, `postgresql://user:pass@host:5432/db?sslmode=disable`)
- `USE_DATABASE=true` — использовать БД (режим работы `DatabaseDataProvider`)
- `USER_ID=<id>` — целевой пользователь (по умолчанию 1)

### Зависимости (Python)
Установите зависимости:
```bash
pip install -r ml_part/requirements.txt
```

### Как запустить (Windows PowerShell)
```powershell
$env:USE_DATABASE = "true"
$env:USER_ID = "1"
# при необходимости:
# $env:DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres?sslmode=disable"
# $env:GEMINI_API_KEY = "..."
python ml_part/main_logic.py
```

### Как это работает шаг за шагом
1. Подключение к LLM: `conect_llm()` читает ключ из `config.env` или переменных окружения и инициализирует Gemini.
2. Обработка мыслей: `process_new_thoughts(...)` находит мысли с `content` без анализа, вызывает `analyze_new_thought(...)` и заполняет поля анализа в `thoughts`.
3. Сбор данных: `get_all_user_data(...)` получает данные из всех таблиц за последние 7 дней.
4. Генерация отчета: `generate_comprehensive_report_with_llm(...)` строит временную линию событий и просит LLM найти корреляции и взаимосвязи.
5. Сохранение отчета: `save_report(...)` пишет итоговый текст в `reports_history`.

### Расширение и отладка
- Порог «необработанных» мыслей задается условием: `content IS NOT NULL` и хотя бы одно из `sentiment_label/sentiment_score/type_thought IS NULL`.
- Для изменения характера отчета установите `ai_prompts_settings.words_for_prompt` для пользователя.
- Логи выводятся в консоль во время работы пайплайна.

### Точки интеграции
- Провайдер БД: `ml_part/db_provider.py` (`DatabaseDataProvider`) — SQL-доступ к таблицам и сохранению результатов.
- Backend (Go) использует те же таблицы; отчеты доступны через таблицу `reports_history`.

Если что-то пошло не так — проверьте ключи `GEMINI_API_KEY`, строку подключения к БД и наличие данных в таблицах за последние 7 дней.
