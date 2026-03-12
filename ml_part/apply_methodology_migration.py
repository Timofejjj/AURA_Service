# Apply methodology_type column to reports_history
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_provider import DatabaseDataProvider
db = DatabaseDataProvider()
db._execute_query("ALTER TABLE reports_history ADD COLUMN IF NOT EXISTS methodology_type VARCHAR(20) DEFAULT NULL", fetch=False)
db._execute_query("COMMENT ON COLUMN reports_history.methodology_type IS 'Тип методики: SOAP, DAP, BASIC ID, PIE'", fetch=False)
print("Migration 005_add_methodology_type applied.")
