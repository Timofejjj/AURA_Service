# Новая система генерации отчетов

## Изменения в бизнес-логике

### Было (старая система)
- Пользователь выбирает диапазон дат
- Отчет генерируется мгновенно через ML API
- Frontend делает polling (опрос каждые 2 секунды)
- Отчет появляется сразу после генерации

### Стало (новая система)
- Пользователь выбирает диапазон дат
- Создается **запрос на отчет** (status: pending)
- Показывается окно: **"Уже готовим ваш отчет. Он появится в течение 24 часов"**
- **Лимит: 2 отчета в неделю**
- Отчет генерируется в фоне (вне scope этой задачи)

---

## Изменения в базе данных

### Таблица `reports_history` - новые колонки

```sql
ALTER TABLE reports_history ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE reports_history ADD COLUMN requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reports_history ALTER COLUMN report DROP NOT NULL;
```

| Колонка | Тип | Описание |
|---------|-----|----------|
| `status` | VARCHAR(20) | `pending` / `completed` / `failed` |
| `requested_at` | TIMESTAMP | Время запроса пользователя |
| `report` | TEXT (nullable) | NULL для pending, текст для completed |

### Индекс для проверки лимита

```sql
CREATE INDEX idx_reports_user_requested 
ON reports_history(user_id, requested_at DESC);
```

---

## Изменения в Backend (Go)

### 1. Модель `Report`

**Файл:** `backend/internal/models/report_history.go`

```go
type Report struct {
    ID           int64      `json:"report_id" db:"report_id"`
    UserID       int64      `json:"user_id" db:"user_id"`
    LogDatetime  *time.Time `json:"created_at,omitempty" db:"log_datetime"`  // Nullable
    Report       *string    `json:"report,omitempty" db:"report"`             // Nullable
    DateFrom     *time.Time `json:"date_from,omitempty" db:"date_from"`
    DateTo       *time.Time `json:"date_to,omitempty" db:"date_to"`
    Status       string     `json:"status" db:"status"`                       // NEW
    RequestedAt  time.Time  `json:"requested_at" db:"requested_at"`           // NEW
}
```

### 2. Repository - проверка лимита

**Файл:** `backend/internal/repository/reports_history.go`

```go
func (r *ReportsHistoryRepo) CheckWeeklyLimit(ctx context.Context, userID int64) (bool, int, error) {
    // Подсчитывает отчеты за последние 7 дней
    // Возвращает: (превышен ли лимит, количество, ошибка)
}
```

### 3. Service - валидация лимита

**Файл:** `backend/internal/services/reports_history.go`

```go
func (s *ReportsHistoryService) CreateReport(ctx context.Context, req *models.CreateReportReq) error {
    // 1. Проверяет лимит (2 отчета в неделю)
    // 2. Возвращает WeeklyLimitError если превышен
    // 3. Создает запрос со status='pending'
}
```

### 4. Handler - обработка лимита

**Файл:** `backend/internal/transport/http/handlers/reports_history.go`

```go
// POST /api/reports
// Возвращает 429 Too Many Requests если превышен лимит
// Возвращает 200 OK с message "Отчет будет готов в течение 24 часов"
```

**Ответ при успехе (200):**
```json
{
  "message": "Отчет будет готов в течение 24 часов",
  "report_id": 123,
  "status": "pending"
}
```

**Ответ при превышении лимита (429):**
```json
{
  "error": "Вы можете запрашивать отчет только 2 раза в неделю",
  "code": "WEEKLY_LIMIT_EXCEEDED"
}
```

---

## Изменения во Frontend (React/TypeScript)

### 1. Интерфейс Report

**Файл:** `frontend/components/ReportsView.tsx`

```typescript
interface Report {
  report_id: number;
  title: string;
  date_from: string;
  date_to: string;
  created_at?: string;        // Nullable (для pending)
  requested_at: string;        // NEW
  status: 'pending' | 'completed' | 'failed';  // NEW
  report?: string;             // Nullable (для pending)
}
```

### 2. Упрощенная генерация отчета

**Убрано:**
- ❌ Polling (startPollingForReport)
- ❌ Проверка количества мыслей
- ❌ Прямой вызов ML API
- ❌ Сложная state машина с localStorage
- ❌ Progress bar анимация

**Добавлено:**
- ✅ Простой POST запрос к `/api/reports`
- ✅ Обработка 429 (лимит превышен)
- ✅ Сообщение "Уже готовим ваш отчет (24ч)"

### 3. Отображение pending отчетов

```tsx
<div 
  style={{
    background: report.status === 'pending' 
      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb923c 100%)'  // Оранжевый
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'  // Фиолетовый
  }}
>
  {report.status === 'pending' ? (
    <>
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-white"></div>
      <h3>Отчет готовится...</h3>
      <p>Появится в течение 24 часов</p>
    </>
  ) : (
    // Обычное отображение готового отчета
  )}
</div>
```

---

## Что НЕ реализовано (вне scope)

Эта задача НЕ включает фоновую генерацию отчетов. Для полного решения нужно добавить:

1. **Cron job / Background worker** для генерации pending отчетов
2. **Обновление status** с `pending` → `completed` после генерации
3. **Заполнение поля `report`** текстом отчета
4. **Установка `log_datetime`** при завершении

### Пример worker (псевдокод)

```python
# ml_part/report_worker.py
def process_pending_reports():
    """Запускается каждый час через cron"""
    pending = db.query("SELECT * FROM reports_history WHERE status='pending'")
    
    for report in pending:
        try:
            # Генерируем отчет
            content = generate_report(report.user_id, report.date_from, report.date_to)
            
            # Обновляем в БД
            db.update(
                report_id=report.id,
                status='completed',
                report=content,
                log_datetime=datetime.now()
            )
        except Exception as e:
            db.update(report_id=report.id, status='failed')
```

---

## Тестирование

### 1. Создание отчета

```bash
# Запрос
curl -X POST http://localhost:8080/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date_from": "2026-01-01",
    "date_to": "2026-01-31"
  }'

# Ответ (успех)
{
  "message": "Отчет будет готов в течение 24 часов",
  "report_id": 11,
  "status": "pending"
}
```

### 2. Проверка лимита

После 2 запросов в неделю:

```bash
# Ответ (429)
{
  "error": "Вы можете запрашивать отчет только 2 раза в неделю",
  "code": "WEEKLY_LIMIT_EXCEEDED"
}
```

### 3. Просмотр pending отчетов

```bash
curl http://localhost:8080/api/reports?user_id=1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ответ
[
  {
    "report_id": 11,
    "user_id": 1,
    "requested_at": "2026-02-12T14:30:00Z",
    "date_from": "2026-01-01T00:00:00Z",
    "date_to": "2026-01-31T23:59:59Z",
    "status": "pending",
    "report": null
  }
]
```

---

## Миграция существующих данных

Все существующие отчеты автоматически получили:
- `status = 'completed'`
- `requested_at = log_datetime`

```sql
UPDATE reports_history 
SET status = 'completed', 
    requested_at = COALESCE(log_datetime, CURRENT_TIMESTAMP)
WHERE status IS NULL OR status = 'pending';
```

---

## Файлы изменены

### Backend (Go)
1. `backend/internal/models/report_history.go` - модель Report + WeeklyLimitError
2. `backend/internal/repository/reports_history.go` - CreateReport + CheckWeeklyLimit
3. `backend/internal/services/reports_history.go` - валидация лимита
4. `backend/internal/transport/http/handlers/reports_history.go` - handler с 429

### Frontend (TypeScript/React)
1. `frontend/components/ReportsView.tsx` - упрощенная логика, отображение pending

### База данных
1. `backend/migrations/001_add_report_status.sql` - миграция
2. `ml_part/apply_migration.py` - скрипт применения

---

## Статус: ✅ Завершено

Все требования реализованы:
- ✅ Запрос на отчет вместо мгновенной генерации
- ✅ Сообщение "Уже готовим ваш отчет (24ч)"
- ✅ Лимит 2 отчета в неделю
- ✅ Всплывающее окно при превышении лимита
- ✅ Отображение pending отчетов в списке
