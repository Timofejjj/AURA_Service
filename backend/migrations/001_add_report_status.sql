-- Миграция: добавление статуса отчета и даты запроса
-- Дата: 2026-02-12

-- Добавляем колонку статуса отчета
ALTER TABLE reports_history 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Добавляем колонку даты запроса
ALTER TABLE reports_history 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Делаем поле report nullable (может быть NULL пока отчет не готов)
ALTER TABLE reports_history 
ALTER COLUMN report DROP NOT NULL;

-- Обновляем существующие записи (они уже готовы)
UPDATE reports_history 
SET status = 'completed', 
    requested_at = log_datetime 
WHERE status IS NULL OR status = 'pending';

-- Комментарии к колонкам
COMMENT ON COLUMN reports_history.status IS 'pending - ожидает генерации, completed - готов, failed - ошибка';
COMMENT ON COLUMN reports_history.requested_at IS 'Время, когда пользователь запросил отчет';
COMMENT ON COLUMN reports_history.log_datetime IS 'Время создания/завершения отчета';

-- Индекс для быстрой проверки лимита запросов
CREATE INDEX IF NOT EXISTS idx_reports_user_requested 
ON reports_history(user_id, requested_at DESC);
