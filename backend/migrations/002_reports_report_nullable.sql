-- Исправление 500 при создании заявки на отчёт.
-- Выполнить один раз вручную, если ошибка "Ошибка создания отчета: 500".
-- Причина: колонка report была NOT NULL, а при заявке мы не передаём текст отчёта.

ALTER TABLE reports_history ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE reports_history ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  ALTER TABLE reports_history ALTER COLUMN report DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_user_requested ON reports_history(user_id, requested_at DESC);
