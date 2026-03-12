-- Таблица заявок на отчёт: только user_id и диапазон дат.
-- При нажатии "Далее" данные пишутся сюда. Готовый отчёт вы вставляете в reports_history.
CREATE TABLE IF NOT EXISTS report_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_requests_user ON report_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_requested ON report_requests(requested_at DESC);
