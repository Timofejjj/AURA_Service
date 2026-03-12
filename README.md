# Aura App — голосовые мысли, ML-анализ и отчёты


Весь фронтенд: https://ai.studio/apps/drive/1IjwPKLvRuZxyFlQ6QBCYy6tgGsIOHKDC

Проект состоит из двух основных частей:

- `backend/` — Go‑сервис с REST API и базой данных (PostgreSQL). Отвечает за учет мыслей, активностей, отчетов, авторизацию и т.д.
- `ml_part/` — Python‑пайплайн, который:
  - транскрибирует голосовые заметки в текст через AssemblyAI;
  - сохраняет текст в таблицу `thoughts` (в колонку `voice_text`);
  - анализирует мысли с помощью Gemini (sentiment/type_thought);
  - строит отчеты по активности пользователя.

Ниже описан полный цикл работы системы, важные команды и требования.

---

## 1. Подготовка окружения

### Python (ml_part)
```bash
cd ml_part
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Go (backend)
```bash
cd backend
go mod download
```

### Настройка конфигурации

`ml_part/config.env` (пример):
```
GEMINI_API_KEY=<ключ Google Gemini>
ASSEMBLYAI_API_KEY=<ключ AssemblyAI>
USER_ID=1
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=disable
```

`backend/app.env` (или переменные окружения):
- `CONN_STRING` — строка подключения к PostgreSQL.
- JWT ключи, настройки логов и пр. (см. `backend/internal/config/config.go`).

---

## 2. Архитектура голосовой транскрибации

### Поток данных
1. Пользователь записывает аудио локально (или через приложение).
2. Python‑скрипт `process_voice_recording(...)` получает путь к файлу.
3. Скрипт:
   - загружает аудио на AssemblyAI (`/v2/upload`);
   - создаёт задачу транскрибации (`/v2/transcript`);
   - опрашивает статус до завершения;
   - возвращает текст.
4. Результат сохраняется в `thoughts` через абстрактный `data_provider`:
   - текст кладётся в колонку `voice_text`;
   - `content` остаётся `NULL`, чтобы отличать голосовые мысли.
5. Далее ML‑пайплайн автоматически находит все мысли (с `content` или `voice_text`)
   без `sentiment_label/sentiment_score/type_thought` и анализирует их через Gemini.

### Ключевые функции
- `ml_part/main_logic.py`
  - `transcribe_audio_file(audio_path)` — изолированный цикл работы с AssemblyAI.
  - `process_voice_recording(data_provider, user_id, audio_path)` — транскрибирует и вызывает `data_provider.save_transcribed_voice(...)`.
  - `process_new_thoughts()` — LLM-анализ новых мыслей (работает и с `voice_text`).
  - `run_ml_pipeline()` — объединяет обработку мыслей и генерацию отчётов.

- `ml_part/data_provider.py`
  - интерфейс `save_transcribed_voice(...)`, который реализуют оба провайдера.

- `ml_part/file_provider.py`
  - сохраняет мысли в CSV (`voice_text` попадает в колонку `voice_text`).

- `ml_part/db_provider.py`
  - сохраняет мысли в PostgreSQL (`voice_text` мапится на столбец `voice_id`).
  - метод `get_unprocessed_thoughts()` ищет записи с `content` ИЛИ `voice_id`.

---

## 3. Как запустить пайплайн

### 3.1. С транскрибацией
```python
from file_provider import FileDataProvider
from main_logic import process_voice_recording

provider = FileDataProvider(data_directory="test_app_data")
process_voice_recording(
    data_provider=provider,
    user_id=1,
    audio_path="audio/example.m4a"
)
```
Результат: в CSV `thoughts.csv` появится запись с заполненной колонкой `voice_text`.
Для реальной БД используйте `DatabaseDataProvider`.

### 3.2. Полный ML пайплайн
```bash
cd ml_part
python main_logic.py
```
Скрипт автоматически:
1. Подключается к Gemini.
2. Ищет мысли без анализа (текстовые или голосовые).
3. Обновляет `sentiment_label`, `sentiment_score`, `type_thought`.
4. Собирает данные из всех таблиц за неделю и генерирует отчёт в `reports_history`.

Переменная `USER_ID` берётся из `config.env` или окружения (поддерживается также `DATABASE_URL`/`CONN_STRING` для подключения к PostgreSQL).

---

## 4. Работа backend

Backend не содержит прямой логики транскрибации — он принимает готовые мысли
(текстовые или голосовые) через API:
- `POST /api/thoughts`
- `PUT /api/thoughts`
- `GET /api/thoughts`
- `DELETE /api/thoughts/:id`

Дополнительно доступны ресурсы: рабочие сессии, перерывы, спорт, вода, кофе,
пищевые записи, шаги, цели и отчёты — см. `backend/internal/transport/http/router.go`.

ML‑пайплайн можно запускать по расписанию (cron, Airflow, др.) или триггерить
после появления новых данных.

---

## 5. Типовой сценарий

1. Пользователь записывает голосовую заметку в приложении и сохраняет файл.
2. Сервис/крон вызывает `process_voice_recording(...)` и отправляет аудио на AssemblyAI.
3. Полученный транскрибированный текст сохраняется как `voice_text` в таблице `thoughts`.
4. Запускается `run_ml_pipeline()`:
   - Gemini анализирует новые мысли (включая голосовые).
   - В `thoughts` заполняются поля `sentiment_label`, `sentiment_score`, `type_thought`.
   - Генерируется отчёт в `reports_history`.
5. Backend‑клиенты (мобильное приложение, веб) получают данные через REST API.

---

## 6. Требования и ограничения

- **AssemblyAI**:
  - поддерживаемые форматы: `mp3`, `wav`, `m4a`, `flac`, `webm`, т.д.
  - таймаут ожидания транскрибации в коде — 5 минут.
- **Gemini**: при анализе мыслей используется модель `gemini-pro`.
- **PostgreSQL**: schema определяется миграциями `backend/internal/database/migrations`.
- **Python версии**: рекомендовано 3.10+.
- **Go версии**: 1.21+.

---

## 7. Полезные команды

### Тестовый запуск FileDataProvider
```bash
cd ml_part
python file_provider.py  # включает демонстрацию CRUD в CSV
```

### Сборка/запуск backend
```bash
cd backend
go run cmd/api/main.go
# или
go build ./cmd/api && ./api
```

---

## 8. Структура репозитория (вкратце)
```
Aura_App-main/
├── backend/              # Go REST API + PostgreSQL
├── ml_part/              # ML и транскрибация (Python)
└── README.md             # этот файл
```

---

## 9. FAQ

**Q:** Почему текст сохраняется в `voice_text`, а не `content`?  
**A:** Чтобы отличать голосовые мысли от текстовых (в БД колонка называется
`voice_id`). Это важно для аналитики и для совместимости с текущей схемой.

**Q:** Что делать, если нужно хранить исходный файл аудио?  
**A:** Добавьте логику в `process_voice_recording` для загрузки в облачные хранилища
и сохраните ссылку в `voice_text` или отдельной колонке (например, `voice_file_url`).

**Q:** Как запускать пайплайн по расписанию?  
**A:** Оберните вызов `python ml_part/main_logic.py` в `cron`, Airflow, Dagster
или используйте Go‑скрипт, который вызывает Python через `subprocess`.

---

По всем вопросам и улучшениям — создавайте issue или PR. Удачи! 🙌
