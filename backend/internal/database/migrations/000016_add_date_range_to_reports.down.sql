-- Удаляем поля диапазона дат
ALTER TABLE reports_history 
DROP COLUMN IF EXISTS date_from,
DROP COLUMN IF EXISTS date_to;

