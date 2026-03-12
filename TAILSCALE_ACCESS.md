# Доступ к приложению Aura через Tailscale Funnel

## Публичные URL (HTTPS)

### Приложение
**https://aura-app.tail8dfcfc.ts.net/app.html**

Это основная точка входа в приложение. Доступно из любого браузера в интернете.

### API Backend
**https://aura-app-api.tail8dfcfc.ts.net**

Backend API для запросов из приложения (автоматически используется Frontend).

---

## Архитектура

```
┌─────────────────────────────────────────────────┐
│  Браузер пользователя (из интернета)           │
└────────────┬────────────────────────────────────┘
             │
             │ HTTPS (Tailscale Funnel)
             │
      ┌──────▼──────┐         ┌──────────────┐
      │  Frontend   │         │   Backend    │
      │  5173       │◄────────┤   8080       │
      │  (Vite)     │  HTTP   │   (Go)       │
      └──────┬──────┘         └──────────────┘
             │                        │
             │ HTTP (прокси)          │ DB
             │                        │
      ┌──────▼──────┐         ┌──────▼──────┐
      │ ML Service  │         │ PostgreSQL  │
      │    8000     │         │    5432     │
      │  (Python)   │         │             │
      └─────────────┘         └─────────────┘
```

### Tailscale Funnel конфигурация

```
https://aura-app.tail8dfcfc.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:5173
    |-- /auth/* -> Vite proxy -> http://localhost:8080
    |-- /api/* -> Vite proxy -> http://localhost:8080 или http://localhost:8000
```

---

## Frontend конфигурация

При доступе через Tailscale Funnel (`*.ts.net`):

- **API_BASE_URL** = `` (относительные пути через Vite прокси)
- **ML_API_BASE_URL** = `` (относительные пути через Vite прокси)

Vite прокси перенаправляет:
- `/auth/*` → `http://localhost:8080`
- `/api/analyze-thought` → `http://localhost:8000`
- `/api/upload-voice` → `http://localhost:8000`
- `/api/mind-score` → `http://localhost:8000`
- `/api/generate-report` → `http://localhost:8000`
- `/api/*` → `http://localhost:8080`

---

## Как запустить с Tailscale Funnel

### Способ 1: Автоматический запуск (рекомендуется)

```powershell
cd "d:\APP\Aura_App-main (3)\Aura_App-main"
.\start_with_tailscale.ps1
```

Этот скрипт:
1. Проверяет PostgreSQL
2. Запускает Backend (Go)
3. Запускает ML Service (Python) с видимыми логами
4. Запускает Frontend (Vite)
5. Настраивает Tailscale Funnel

### Способ 2: Ручная настройка Funnel

Если сервисы уже запущены, просто активируйте Funnel:

```powershell
# Установить hostname
tailscale set --hostname=aura-app

# Запустить Funnel для Frontend
tailscale funnel --bg 5173

# Запустить Funnel для Backend (в другом терминале)
# ВАЖНО: Нужно два разных Funnel на двух разных машинах или
# использовать tailscale serve для настройки нескольких маршрутов
```

### Проверка статуса

```powershell
tailscale funnel status
```

Должно показать:
```
# Funnel on:
#     - https://aura-app-api.tail8dfcfc.ts.net
#     - https://aura-app.tail8dfcfc.ts.net
```

---

## Проверка работоспособности

1. **Frontend доступен:**
   ```
   https://aura-app.tail8dfcfc.ts.net/app.html
   ```
   Должна открыться страница входа/регистрации.

2. **Backend доступен через API:**
   ```
   https://aura-app-api.tail8dfcfc.ts.net/
   ```
   Может вернуть 404 (это нормально - нет корневого маршрута).

3. **Откройте DevTools (F12) в браузере:**
   - Console должна показать:
     ```
     [API Config] hostname: aura-app.tail8dfcfc.ts.net
     [API Config] protocol: https:
     [API Config] isTailscaleFunnel: true
     [API Config] API_BASE_URL: https://aura-app-api.tail8dfcfc.ts.net
     ```

---

## Требования

- **Tailscale** установлен и запущен
- **PostgreSQL** работает на localhost:5432
- **Backend** (Go) запущен на localhost:8080
- **ML Service** (Python) запущен на localhost:8000
- **Frontend** (Vite dev server) запущен на localhost:5173

---

## Локальный доступ (без Tailscale)

Если работаете локально:

```
http://localhost:5173/app.html
```

Frontend автоматически определит локальный режим и будет использовать:
- API: `http://localhost:8080`
- ML: `http://localhost:8000`

---

## Устранение проблем

### Frontend не загружается (404)

Проверьте, запущен ли Vite dev server:
```powershell
netstat -ano | findstr ":5173"
```

### Backend запросы не работают (CORS ошибки)

1. Проверьте Backend:
   ```powershell
   netstat -ano | findstr ":8080"
   ```

2. Проверьте CORS настройки в `backend/internal/transport/http/router.go` - должен разрешать `*.ts.net`

### ML запросы не работают

1. Проверьте ML Service:
   ```powershell
   netstat -ano | findstr ":8000"
   curl http://localhost:8000/health
   ```

2. Проверьте прокси Vite в `frontend/vite.config.ts`

### Tailscale Funnel не активен

```powershell
tailscale funnel status
```

Если показывает "no funnel", запустите:
```powershell
tailscale funnel --bg 5173
```

---

## Безопасность

⚠️ **ВАЖНО:** Tailscale Funnel делает приложение **публично доступным** из интернета.

Убедитесь:
- ✅ Аутентификация включена (login/register)
- ✅ Backend проверяет JWT токены
- ✅ Нет открытых debug эндпоинтов
- ✅ PostgreSQL недоступен из интернета (только localhost)
- ✅ ML Service недоступен напрямую (только через Frontend прокси)

---

## Дополнительная информация

- [Tailscale Funnel документация](https://tailscale.com/kb/1223/tailscale-funnel/)
- [Vite прокси конфигурация](https://vitejs.dev/config/server-options.html#server-proxy)
