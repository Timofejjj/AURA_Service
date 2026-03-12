-- Тип методики отчёта: SOAP, DAP, BASIC ID, PIE
ALTER TABLE reports_history
ADD COLUMN IF NOT EXISTS methodology_type VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN reports_history.methodology_type IS 'Тип методики: SOAP, DAP, BASIC ID, PIE';
