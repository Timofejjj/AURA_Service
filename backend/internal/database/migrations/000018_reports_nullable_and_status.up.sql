-- Заявка на отчёт без текста: только user_id, date_from, date_to (report = NULL до готовности).
-- Колонка report должна быть nullable, иначе INSERT при создании заявки даёт 500.

-- Добавляем колонки, если их ещё нет (на случай старых БД без 001_add_report_status)
ALTER TABLE reports_history ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE reports_history ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Разрешаем NULL в report (заявка создаётся без текста отчёта)
DO $$
BEGIN
  ALTER TABLE reports_history ALTER COLUMN report DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL; /* уже nullable или другая ошибка — не ломаем миграцию */
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_user_requested ON reports_history(user_id, requested_at DESC);
