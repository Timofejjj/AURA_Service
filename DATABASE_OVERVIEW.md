# Текущая база данных Aura (PostgreSQL)

**Подключение:** `postgresql://aura:aura@localhost:5432/aura`

---

## Таблицы (5 штук)

### 1. `users` — пользователи  
**Строк: 6**

| Колонка         | Тип        | Описание                    |
|-----------------|------------|-----------------------------|
| user_id         | integer    | PK                          |
| username        | varchar    | Имя пользователя            |
| email           | varchar    | Email                       |
| password        | varchar    | Хэш пароля                  |
| created_at      | timestamp  | Дата регистрации            |
| google_sub      | varchar    | ID Google (если вход через Google) |
| auth_provider   | varchar    | `local` / google            |
| avatar_url      | text       | URL аватара                |

**Пример:** Tima, GGG, РРР и ещё 3 пользователя.

---

### 2. `thoughts` — записи (мысли)  
**Строк: 39**

| Колонка         | Тип        | Описание                    |
|-----------------|------------|-----------------------------|
| thought_id      | bigint     | PK                          |
| user_id         | integer    | FK → users                  |
| created_at      | timestamp  | Время создания              |
| content         | text       | Текст (если ввод с клавиатуры) |
| voice_text      | text       | Текст голосовой записи      |
| sentiment_label | varchar    | positive / negative / neutral |
| sentiment_score | numeric    | Оценка сентимента           |
| minio_id        | text       | ID файла в MinIO            |
| type_thought    | varchar    | Категория (Работа, Планы и т.д.) |
| mind_score      | double     | Накопительный показатель настроения |

**Примеры записей:** «Моя первая запись», «Отдых», «Итрот» и др.

---

### 3. `reports_history` — сгенерированные отчёты  
**Строк: 1** (в дампе; по факту может быть больше)

| Колонка     | Тип        | Описание              |
|-------------|------------|------------------------|
| report_id   | integer    | PK                     |
| user_id     | integer    | FK → users            |
| log_datetime| timestamp  | Время создания отчёта |
| report      | text       | Текст отчёта (Markdown) |
| date_from   | timestamp  | Начало периода        |
| date_to     | timestamp  | Конец периода         |

**Пример:** report_id=10, user_id=1, от 2026-02-12; текст начинается с «# 1️⃣ Карта внутреннего опыта».

---

### 4. `ai_prompts_settings` — настройки онбординга (слова для промпта)  
**Строк: 1**

| Колонка         | Тип     | Описание                |
|-----------------|---------|-------------------------|
| user_id         | integer | PK, FK → users         |
| words_for_prompt| text    | Слова/теги для контекста |

**Пример:** user_id=1, words_for_prompt=`лидерство, сон`.

---

### 5. `refresh_sessions` — сессии обновления токенов  
**Строк: 49**

| Колонка       | Тип        | Описание           |
|---------------|-------------|--------------------|
| id            | bigint      | PK                 |
| user_id       | bigint      | FK → users         |
| refresh_token | text        | JWT refresh-токен  |
| user_agent    | text        | User-Agent браузера |
| fingerprint   | text        | Отпечаток клиента  |
| expires_at    | timestamptz | Истечение сессии   |
| created_at    | timestamptz | Создание сессии    |

---

## Сводка по объёму данных

| Таблица             | Строк |
|---------------------|-------|
| users               | 6     |
| thoughts            | 39    |
| reports_history     | 1*    |
| ai_prompts_settings | 1     |
| refresh_sessions    | 49    |

\* На момент дампа в вывод скрипта попала 1 строка; в БД может быть больше отчётов.

---

## Связи

- **users** — центральная таблица: с ней связаны thoughts, reports_history, ai_prompts_settings, refresh_sessions по `user_id`.
- **thoughts** — хранит контент и результаты ML (категория, сентимент, mind_score).
- **reports_history** — отчёты по выбранному периоду для пользователя.

Полный дамп структуры и примеров строк сохранён в: `ml_part/database_schema.txt`.
