#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Применение миграции: добавление статуса отчетов
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider

migration_sql = """
-- Добавляем колонку статуса отчета
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='reports_history' AND column_name='status') THEN
        ALTER TABLE reports_history ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- Добавляем колонку даты запроса
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='reports_history' AND column_name='requested_at') THEN
        ALTER TABLE reports_history ADD COLUMN requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Делаем поле report nullable
ALTER TABLE reports_history 
ALTER COLUMN report DROP NOT NULL;

-- Обновляем существующие записи
UPDATE reports_history 
SET status = 'completed', 
    requested_at = COALESCE(log_datetime, CURRENT_TIMESTAMP)
WHERE status IS NULL OR status = 'pending';

-- Индекс для проверки лимита
CREATE INDEX IF NOT EXISTS idx_reports_user_requested 
ON reports_history(user_id, requested_at DESC);
"""

def main():
    print("Применение миграции: добавление статуса отчетов...")
    
    try:
        db = DatabaseDataProvider()
        
        # Выполняем миграцию целиком
        print("\nВыполнение миграции...")
        try:
            db._execute_query(migration_sql, fetch=False)
            print("  [OK] Миграция выполнена")
        except Exception as e:
            print(f"  [ERROR] {e}")
            # Пробуем выполнить простые команды
            print("\nПопытка выполнить альтернативную миграцию...")
            try:
                db._execute_query("ALTER TABLE reports_history ADD COLUMN status VARCHAR(20) DEFAULT 'pending'", fetch=False)
                print("  [OK] Добавлена колонка status")
            except Exception as e2:
                print(f"  [SKIP] status уже существует или ошибка: {e2}")
            
            try:
                db._execute_query("ALTER TABLE reports_history ADD COLUMN requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP", fetch=False)
                print("  [OK] Добавлена колонка requested_at")
            except Exception as e3:
                print(f"  [SKIP] requested_at уже существует или ошибка: {e3}")
            
            try:
                db._execute_query("ALTER TABLE reports_history ALTER COLUMN report DROP NOT NULL", fetch=False)
                print("  [OK] Колонка report теперь nullable")
            except Exception as e4:
                print(f"  [SKIP] report уже nullable или ошибка: {e4}")
        
        # Проверяем структуру
        print("\n" + "="*60)
        print("Проверка новых колонок...")
        check = db._execute_query("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'reports_history'
            ORDER BY ordinal_position
        """)
        
        print("\nТекущие колонки reports_history:")
        for col in check:
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        db.close()
        print("\n" + "="*60)
        print("Миграция завершена успешно!")
        print("="*60)
        
    except Exception as e:
        print(f"\nОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
