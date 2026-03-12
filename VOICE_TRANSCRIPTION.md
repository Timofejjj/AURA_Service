# Voice Transcription System (AssemblyAI + Gemini)

Этот документ описывает, как реализована подсистема преобразования голосовых заметок в текст и дальнейшая ML‑обработка в проекте Aura App. Здесь приведены архитектура, взаимодействие модулей, точки интеграции с базой данных и требования к окружению.

---

## 1. Общая схема

```
(audio file) → main_logic.process_voice_recording()
    → AssemblyAI API (upload + transcription)
        → текст → data_provider.save_transcribed_voice()
            → таблица thoughts.voice_id (voice_text)
                → ML пайплайн (Gemini) анализирует и обновляет sentiment/type
                    → результаты хранятся в thoughts
                        → backend API читает и выдает мысли клиентам
```

---

## 2. Основные компоненты

| Компонент | Файл | Назначение |
|-----------|------|------------|
| `process_voice_recording` | `ml_part/main_logic.py` | Управляет полным циклом транскрибации: чтение аудио, загрузка в AssemblyAI, ожидание результата, сохранение в БД. |
| `transcribe_audio_file` | `ml_part/main_logic.py` | Изолированный цикл работы с AssemblyAI API (upload → create transcript → polling). |
| `AssemblyAI` | внешний сервис | Принимает аудио (до 32MB за запрос), возвращает текст. Из API используются `POST /v2/upload`, `POST /v2/transcript`, `GET /v2/transcript/{id}`. |
| `AbstractDataProvider.save_transcribed_voice` | `ml_part/data_provider.py` | Контракт для сохранения текста транскрипта. Реализован в `file_provider.py` (CSV) и `db_provider.py` (PostgreSQL). |
| `FileDataProvider` | `ml_part/file_provider.py` | Пишет результат в `thoughts.csv`, колонка `voice_text`. |
| `DatabaseDataProvider` | `ml_part/db_provider.py` | Пишет результат в таблицу `thoughts`. `voice_text` мапится на столбец `voice_id`. |
| `process_new_thoughts` | `ml_part/main_logic.py` | Ищет мысли, у которых заполнен `content` или `voice_text`, но отсутствуют `sentiment_label/score/type_thought`. Запускает анализ в Gemini. |
| `backend` | `backend/…` | Не занимается транскрибацией напрямую; просто читает/пишет мысли через REST API. |

---

## 3. Потоки данных

### 3.1. Транскрибация

1. **Вход**: локальный файл (например `audio/idea.m4a`).  
2. `process_voice_recording`:
   - загружает аудио в AssemblyAI (потоковая передача файла в `POST /v2/upload`);
   - получает `upload_url`, передает его на `POST /v2/transcript` с параметром `speech_model` (по умолчанию `universal`);
   - каждые 3 секунды вызывает `GET /v2/transcript/{id}` до статуса `completed` или `error` (максимум 5 минут).
3. **Результат**: строка `transcript_text`.
4. **Сохранение** (`data_provider.save_transcribed_voice`):
   - `content` = `NULL`;
   - `voice_text` = `transcript_text`;
   - `type_thought` = `"voice"` (по умолчанию);
   - `sentiment_*` не заполняются (их заполнит ML-пайплайн).

### 3.2. Анализ и отчёты

1. `process_new_thoughts` извлекает все мысли пользователя за 30 дней:
   - проверяет наличие текста в `content` **или** `voice_text`;
   - фильтрует записи без `sentiment_label` / `sentiment_score` / `type_thought`.
2. Gemini (`analyze_new_thought`) возвращает:
   - `sentiment_label` (positive/negative/neutral),
   - `sentiment_score` (−1.0…1.0),
   - `type_thought` (task/plan/retrospective/memories).
3. Результаты записываются в те же строки таблицы `thoughts`.
4. `run_ml_pipeline` дополнительно формирует отчёт (корреляции активности) и сохраняет его в `reports_history`.

---

## 4. База данных

### 4.1. Таблица `thoughts`

| Колонка | Назначение |
|---------|------------|
| `thought_id` | PK |
| `user_id` | в связке с конкретным пользователем |
| `created_at`, `submitted_at` | таймштампы |
| `content` | текстовые мысли (ручной ввод) |
| `voice_id` | текст транскрибированного голоса (в ML‑части называется `voice_text`) |
| `type_thought` | тип (task/plan/retrospective/memories/voice …) |
| `sentiment_label`, `sentiment_score` | эмоциональная окраска |
| `image_id`, `sentiment…` | дополнительные поля |

### 4.2. Алгоритм сохранения голосовых заметок

```
save_transcribed_voice(user_id, created_at, submitted_at, voice_text, thought_type)
    -> INSERT INTO thoughts(
           user_id, created_at, submitted_at,
           content=NULL, voice_id=voice_text,
           type_thought=thought_type,
           sentiment_label=NULL, sentiment_score=NULL
       )
```

---

## 5. Конфигурация и ключи

- `ml_part/config.env`
  - `ASSEMBLYAI_API_KEY` — ключ для API AssemblyAI.
  - `GEMINI_API_KEY` — ключ для Google Gemini (LLM).
  - `USE_DATABASE` — `true/false` (использовать PostgreSQL или csv-файлы).
  - `USER_ID` — ID пользователя, для которого запускается пайплайн.
  - `DATABASE_URL` / `CONN_STRING` — строка подключения к PostgreSQL (если `USE_DATABASE=true`).

Если переменная не найдена в окружении, она читается из `config.env`.

---

## 6. Ограничения и тайминги

| Параметр | Значение | Где задаётся |
|----------|----------|--------------|
| Поддерживаемые аудио форматы | практически любые (`mp3`, `wav`, `m4a`, `flac`, `webm`, ...) | ограничение AssemblyAI |
| Размер файла | до ~32MB за один запрос (при большем объеме разбивать) | AssemblyAI API |
| Интервал опроса статуса | 3 секунды | `ASSEMBLYAI_POLL_INTERVAL_SECONDS` |
| Таймаут ожидания | 5 минут | `ASSEMBLYAI_MAX_WAIT_SECONDS` |
| Модель транскрибации | `speech_model = "universal"` (можно заменить) | `start_transcription_job` |
| Обработка мыслей | последние 30 дней | `process_new_thoughts` (при fallback) |

---

## 7. Пошаговое руководство

### 7.1. Транскрибировать и сохранить одну запись

```python
from db_provider import DatabaseDataProvider
from main_logic import process_voice_recording

provider = DatabaseDataProvider()  # читает DATABASE_URL из config.env / окружения
thought_id = process_voice_recording(
    data_provider=provider,
    user_id=1,
    audio_path="audio/entry.wav",
    thought_type="voice"
)
print("Saved voice thought:", thought_id)
```

### 7.2. Запуск обработки мыслей и отчёта

```bash
cd ml_part
python main_logic.py
```

Скрипт всегда использует `DatabaseDataProvider`, то есть работает напрямую с PostgreSQL (строка подключения читается из переменных окружения или `config.env`).

### 7.3. Интеграция с backend

Backend (Go) не вызывает транскрибацию напрямую. Вместо этого:
- голосовые мысли появляются в БД от Python‑пайплайна;
- HTTP‑эндпоинты `/api/thoughts` показывают уже готовые записи (`content` или `voice_id`) с аналитикой.

---

## 8. Типовой сценарий эксплуатации

1. **Сбор аудио**: мобильное или десктоп приложение пишет файл на диск/облако.
2. **Сервис транскрибации** (Python) периодически проверяет новые файлы и вызывает `process_voice_recording`:
   - загружает аудио в AssemblyAI и получает текст;
   - текст сохраняется как голосовая мысль (`voice_text`) в `thoughts`.
3. **ML‑анализ** запускается по расписанию (cron, Airflow, др.):
   - анализирует все свежие мысли (включая голосовые) и обновляет `sentiment`+`type`;
   - формирует отчёт в `reports_history`.
4. **Backend** предоставляет REST API для приложений. Пользователь видит результаты транскрибации и анализа в интерфейсе.

---

## 9. Debug и мониторинг

- При отсутствии ключа `ASSEMBLYAI_API_KEY` `process_voice_recording` выбросит исключение.
- Логи:
  - `print("ИНФО ...")`, `print("ОШИБКА ...")` в `main_logic.py`.
  - При необходимости можно заменить на `logging`.
- Для ручной проверки используйте FileDataProvider (`test_app_data/`) —
  не требует PostgreSQL, позволяет быстро увидеть формат данных.

---

## 10. Дополнительные идеи

- **Хранить исходное аудио**: дополнительно загружать файл в S3/GCS, сохранять URL в отдельном поле.
- **Стриминговая транскрибация**: использовать WebSocket API AssemblyAI (если потребуется live‑режим).
- **Оптимизация ML**: вынести `process_new_thoughts` в отдельный сервис и запускать по очередям.
- **UI/Backend интеграция**: добавить endpoint в Go для приёма аудио и проксирования запроса к Python‑сервису (если аудио приходит через HTTP).

---

## 11. Важные файлы

- `ml_part/main_logic.py`
- `ml_part/data_provider.py`
- `ml_part/file_provider.py`
- `ml_part/db_provider.py`
- `ml_part/config.env`
- `ml_part/requirements.txt`
- `backend/internal/repository/thoughts.go` (для понимания структуры таблицы)

---

