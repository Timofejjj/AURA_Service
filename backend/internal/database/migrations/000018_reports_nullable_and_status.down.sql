-- Откат: вернуть NOT NULL для report (только если в таблице нет NULL в report)
-- Внимание: если есть строки с report IS NULL, откат упадёт.
ALTER TABLE reports_history ALTER COLUMN report SET NOT NULL;

DROP INDEX IF EXISTS idx_reports_user_requested;
