# Устранение проблем с доступом через Tailscale Funnel

## Проверка доступности

### Ссылка на приложение
**https://aura-app.tail8dfcfc.ts.net/app.html**

---

## Важно для мобильного Chrome (телефон)

**Если ссылка не грузится на телефоне:** Frontend должен быть запущен **с отключённым HMR** (WebSocket мешает загрузке на мобильном).

1. **Запускайте приложение через:** `.\start_with_tailscale.ps1`  
   Скрипт автоматически запускает Frontend с `VITE_DISABLE_HMR=1`.

2. **Если Frontend уже запущен вручную** — остановите его и запустите заново с переменной:
   ```powershell
   cd frontend
   $env:VITE_DISABLE_HMR='1'; npm run dev
   ```
   Затем снова включите Funnel: `tailscale funnel --bg 5173`

---

## Быстрая диагностика

### 1. Проверка Tailscale Funnel
```powershell
tailscale funnel status
```

**Должно показать:**
```
# Funnel on:
#     - https://aura-app-api.tail8dfcfc.ts.net
#     - https://aura-app.tail8dfcfc.ts.net

https://aura-app.tail8dfcfc.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:5173
```

### 2. Проверка локальных сервисов
```powershell
netstat -ano | findstr ":5173 :8080 :8000 :5432"
```

**Должны быть активны все 4 порта:**
- 5173 (Frontend)
- 8080 (Backend)  
- 8000 (ML Service)
- 5432 (PostgreSQL)

### 3. Проверка доступа через curl
```powershell
curl https://aura-app.tail8dfcfc.ts.net/app.html
```

**Должен вернуть:** Status 200 и HTML контент

---

## Типичные проблемы и решения

### Проблема 1: "Сайт недоступен" или "ERR_NAME_NOT_RESOLVED"

**Причина:** Tailscale Funnel не активен или DNS ещё не обновился.

**Решение:**
```powershell
# Остановить Funnel
tailscale funnel off

# Подождать 2 секунды
Start-Sleep -Seconds 2

# Запустить Funnel заново
tailscale funnel --bg 5173

# Проверить статус
tailscale funnel status
```

---

### Проблема 2: "Страница загружается, но пустая"

**Причина:** Frontend (Vite) не запущен на localhost:5173.

**Решение:**
```powershell
# Проверить Frontend
netstat -ano | findstr ":5173"

# Если не запущен - запустить
cd "d:\APP\Aura_App-main (3)\Aura_App-main\frontend"
npm run dev
```

---

### Проблема 3: "Ошибки 404 при работе с API"

**Причина:** Backend не запущен или недоступен.

**Решение:**
```powershell
# Проверить Backend
netstat -ano | findstr ":8080"

# Если не запущен - запустить
cd "d:\APP\Aura_App-main (3)\Aura_App-main\backend"
go run ./cmd/api
```

---

### Проблема 4: "CORS ошибки в браузере"

**Причина:** CORS настройки Backend не включают домен Tailscale.

**Решение:**
1. Откройте `backend/internal/transport/http/router.go`
2. Убедитесь, что в CORS разрешены домены `*.ts.net`:

```go
AllowOriginFunc: func(origin string) bool {
    if strings.Contains(strings.ToLower(origin), ".ts.net") {
        return true
    }
    return false
},
```

3. Перезапустите Backend

---

### Проблема 5: "ML функции не работают"

**Причина:** ML Service не запущен или недоступен.

**Решение:**
```powershell
# Проверить ML Service
netstat -ano | findstr ":8000"

# Проверить health
curl http://localhost:8000/health

# Если не запущен - запустить с видимыми логами
cd "d:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
.\start_ml_visible.ps1
```

---

### Проблема 6: "Tailscale говорит: funnel is not enabled"

**Причина:** Funnel не включен в настройках Tailscale.

**Решение:**
1. Откройте Tailscale настройки
2. Включите функцию "Funnel"
3. Или используйте команду:
```powershell
tailscale set --accept-routes
```

---

### Проблема 7: "Долгая загрузка или таймауты"

**Причина:** Медленное интернет соединение или проблемы с Tailscale.

**Решение:**
1. Проверьте скорость интернета
2. Проверьте статус Tailscale:
```powershell
tailscale status
```
3. Перезапустите Tailscale:
```powershell
tailscale down
tailscale up
```

---

### Проблема 8: "Invalid certificate" или SSL ошибки

**Причина:** Tailscale Funnel использует собственные сертификаты.

**Решение:**
- Это нормально для Tailscale Funnel
- Браузеры должны автоматически доверять Tailscale сертификатам
- Если нет - обновите Tailscale до последней версии

---

## Полный перезапуск всего приложения

Если ничего не помогает:

### 1. Остановить все сервисы
```powershell
# Остановить Funnel
tailscale funnel off

# Найти и остановить процессы
$ports = @(5173, 8080, 8000)
foreach ($port in $ports) {
    $p = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($p) { Stop-Process -Id $p -Force }
}
```

### 2. Подождать 5 секунд
```powershell
Start-Sleep -Seconds 5
```

### 3. Запустить через скрипт
```powershell
cd "d:\APP\Aura_App-main (3)\Aura_App-main"
.\start_with_tailscale.ps1
```

---

## Проверка через DevTools браузера

### Откройте DevTools (F12) и проверьте:

1. **Console** - должны быть логи:
```
[API Config] hostname: aura-app.tail8dfcfc.ts.net
[API Config] protocol: https:
[API Config] isTailscaleFunnel: true
[API Config] API_BASE_URL: https://aura-app-api.tail8dfcfc.ts.net
```

2. **Network** - при загрузке страницы:
- `app.html` - должен быть 200
- `/app-entry.tsx` - должен быть 200
- Запросы к `/auth/*` и `/api/*` должны идти на `aura-app-api.tail8dfcfc.ts.net`

3. **Console Errors** - проверьте наличие ошибок:
- CORS ошибки → проблема с Backend CORS
- 404 ошибки → проблема с маршрутизацией
- Network errors → проблема с доступностью сервисов

---

## Контакты для поддержки

Если проблема не решена:

1. Проверьте логи Backend (окно PowerShell)
2. Проверьте логи ML Service (окно PowerShell)
3. Проверьте консоль Frontend (DevTools)
4. Сделайте скриншот ошибки

---

## Дополнительные команды

### Проверить все сервисы одной командой
```powershell
Write-Host "PostgreSQL (5432):" -ForegroundColor Cyan
netstat -ano | findstr ":5432" | Select-Object -First 1
Write-Host "`nBackend (8080):" -ForegroundColor Cyan  
netstat -ano | findstr ":8080" | Select-Object -First 1
Write-Host "`nML Service (8000):" -ForegroundColor Cyan
netstat -ano | findstr ":8000" | Select-Object -First 1
Write-Host "`nFrontend (5173):" -ForegroundColor Cyan
netstat -ano | findstr ":5173" | Select-Object -First 1
Write-Host "`nTailscale Funnel:" -ForegroundColor Cyan
tailscale funnel status
```

### Проверить доступность всех URL
```powershell
Write-Host "Проверка https://aura-app.tail8dfcfc.ts.net/app.html"
curl https://aura-app.tail8dfcfc.ts.net/app.html -UseBasicParsing | Select-Object StatusCode

Write-Host "`nПроверка https://aura-app-api.tail8dfcfc.ts.net/"
curl https://aura-app-api.tail8dfcfc.ts.net/ -UseBasicParsing | Select-Object StatusCode
```

---

## Статус: Всё работает ✅

**Последняя проверка показала:**
- ✅ Frontend доступен (Status 200)
- ✅ Tailscale Funnel активен
- ✅ Все сервисы запущены

**Ссылка работает:** https://aura-app.tail8dfcfc.ts.net/app.html
