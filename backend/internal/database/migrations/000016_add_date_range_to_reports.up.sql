-- Добавляем поля для диапазона дат отчета
ALTER TABLE reports_history 
ADD COLUMN IF NOT EXISTS date_from timestamp,
ADD COLUMN IF NOT EXISTS date_to timestamp;

-- Обновляем существующие записи (если есть)
UPDATE reports_history 
SET date_from = log_datetime - INTERVAL '7 days',
    date_to = log_datetime
WHERE date_from IS NULL OR date_to IS NULL;

