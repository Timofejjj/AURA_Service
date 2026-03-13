# Aura App — мысли, дневник и отчёты

Весь фронтенд: https://ai.studio/apps/drive/1IjwPKLvRuZxyFlQ6QBCYy6tgGsIOHKDC

Проект состоит из двух частей:

- **`backend/`** — Go‑сервис с REST API и базой данных (PostgreSQL). Учёт мыслей, активностей, отчётов, авторизация.
- **`frontend/`** — SPA на React (Vite). Дневник, отчёты, настройки.

ML‑сервис (транскрипция голоса, анализ мыслей) из проекта удалён по текущей бизнес-логике.

---

## 1. Подготовка окружения

### Go (backend)
```bash
cd backend
go mod download
```

### Frontend
```bash
cd frontend
npm install
```

### Настройка конфигурации

**Backend** — `backend/app.env` (или переменные окружения):
- `CONN_STRING` — строка подключения к PostgreSQL
- JWT-ключи, настройки логов (см. `backend/internal/config/config.go`)

---

## 2. Запуск

**Одной командой (Backend + Frontend):**
```bash
python start_all.py
```

- Backend: http://localhost:8080  
- Frontend: http://localhost:5173  
- Приложение: http://localhost:5173/app.html  

**По отдельности:**
```bash
# Терминал 1 — backend
cd backend && go run ./cmd/api/main.go

# Терминал 2 — frontend
cd frontend && npm run dev
```

---

## 3. Backend API

- `POST/GET/PUT/DELETE /api/thoughts` — мысли
- Рабочие сессии, перерывы, спорт, отчёты и др. — см. `backend/internal/transport/http/router.go` и Swagger (`/docs`).

---

## 4. Структура репозитория

```
Aura_App-main/
├── backend/     # Go REST API + PostgreSQL
├── frontend/    # React SPA (Vite)
├── start_all.py # Запуск Backend + Frontend
└── README.md
```

---

По вопросам — создавайте issue или PR.
