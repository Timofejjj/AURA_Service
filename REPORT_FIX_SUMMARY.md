# Исправление проблемы с генерацией отчетов

## Проблема
Пользователь сообщил, что в приложении не генерируются отчеты.

## Диагностика

### 1. Проверка ML сервиса
- ML сервис работает корректно на порту 8000
- API endpoint `/api/generate-report` доступен и работает
- Подключение к базе данных установлено

### 2. Проверка базы данных
Проверка показала, что отчеты **ГЕНЕРИРУЮТСЯ И СОХРАНЯЮТСЯ** в БД:
```
Report ID: 9, User ID: 1, Created: 2026-02-12 13:37:57
Report ID: 8, User ID: 1, Created: 2026-01-30 15:38:29
```

Содержимое отчетов корректное, с Markdown форматированием.

### 3. Обнаружена проблема
Проблема была в **несоответствии полей между backend и frontend**:

**Backend возвращал (models/report_history.go):**
```go
type Report struct {
    ID          int64      `json:"id" db:"report_id"`
    LogDatetime time.Time  `json:"log_datetime" db:"log_datetime"`
    ...
}
```

**Frontend ожидал (ReportsView.tsx):**
```typescript
interface Report {
  report_id: number;
  created_at: string;
  ...
}
```

## Решение

### Изменение 1: Исправление модели в backend
Файл: `backend/internal/models/report_history.go`

```go
type Report struct {
    ID          int64      `json:"report_id" db:"report_id"` // Изменено с "id" на "report_id"
    LogDatetime time.Time  `json:"created_at" db:"log_datetime"` // Добавлен alias "created_at"
    Report      string     `json:"report" db:"report"`
    DateFrom    *time.Time `json:"date_from,omitempty" db:"date_from"`
    DateTo      *time.Time `json:"date_to,omitempty" db:"date_to"`
}
```

### Изменение 2: Добавление логирования в frontend
Файл: `frontend/components/ReportsView.tsx`

Добавлено дополнительное логирование для отладки:
```typescript
console.log('[fetchReports] Starting report fetch for user_id:', userId);
console.log('[fetchReports] API URL:', `${API_BASE_URL}/api/reports?user_id=${userId}`);
console.log('[fetchReports] Has token:', !!token);
```

### Изменение 3: Перезапуск backend
Backend был перезапущен для применения изменений в модели.

## Проверка работы

### Текущее состояние
1. ✅ ML сервис работает (порт 8000)
2. ✅ Backend работает (порт 8080, перезапущен с исправлениями)
3. ✅ В БД есть отчеты (ID: 8 и 9)
4. ✅ Формат JSON теперь соответствует ожиданиям frontend

### Ожидаемый результат
Теперь frontend должен:
1. Успешно получать отчеты из backend API
2. Корректно парсить JSON с полями `report_id` и `created_at`
3. Отображать список отчетов в интерфейсе

### Пример правильного ответа от backend
```json
{
  "report_id": 9,
  "user_id": 1,
  "created_at": "2026-02-12T13:37:57.446518",
  "report": "## 1️⃣ Карта внутреннего опыта...",
  "date_from": "2026-01-13T00:00:00",
  "date_to": "2026-02-12T23:59:59"
}
```

## Как проверить исправление

1. Откройте приложение в браузере: `http://localhost:5173`
2. Войдите в систему (User ID: 1)
3. Перейдите в раздел "Отчеты"
4. Вы должны увидеть список отчетов (минимум 2 отчета)
5. При клике на отчет откроется детальное представление с Markdown форматированием

## Дополнительные улучшения

Если отчеты все еще не отображаются, проверьте:
1. Консоль браузера (F12) для логов `[fetchReports]`
2. Вкладку Network для проверки запросов к API
3. Наличие токена авторизации в localStorage

## Файлы, которые были изменены

1. `backend/internal/models/report_history.go` - исправлена модель Report
2. `frontend/components/ReportsView.tsx` - добавлено логирование

## Команды для перезапуска (если потребуется)

```powershell
# Остановить backend (найти PID)
Get-NetTCPConnection -LocalPort 8080 | Select -ExpandProperty OwningProcess | ForEach { Stop-Process -Id $_ -Force }

# Запустить backend
cd backend
go run ./cmd/api
```

## Заключение

**Проблема была не в генерации отчетов (они генерируются корректно), а в несоответствии имен полей между backend и frontend.** После исправления модели в backend приложение должно корректно отображать отчеты.
