#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Простая проверка БД
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider

try:
    print("Подключение к БД...")
    db_provider = DatabaseDataProvider()
    print("[OK] Подключение установлено\n")
    
    # Проверяем отчеты
    print("=== ОТЧЕТЫ (reports_history) ===")
    query = "SELECT COUNT(*) as count FROM reports_history"
    result = db_provider._execute_query(query)
    print(f"Всего отчетов: {result[0]['count']}\n")
    
    # Последние 5 отчетов
    query = "SELECT report_id, user_id, log_datetime, LEFT(report, 50) as preview FROM reports_history ORDER BY log_datetime DESC LIMIT 5"
    reports = db_provider._execute_query(query)
    if reports:
        print("Последние отчеты:")
        for r in reports:
            print(f"  ID: {r['report_id']}, User: {r['user_id']}, Date: {r['log_datetime']}")
            print(f"    Preview: {r['preview']}...")
    else:
        print("Отчетов не найдено\n")
    
    # Проверяем мысли
    print("\n=== МЫСЛИ (thoughts) ===")
    query = "SELECT user_id, COUNT(*) as count FROM thoughts GROUP BY user_id ORDER BY count DESC LIMIT 5"
    result = db_provider._execute_query(query)
    if result:
        print("Пользователи с мыслями:")
        for row in result:
            print(f"  User {row['user_id']}: {row['count']} мыслей")
    else:
        print("Мысли не найдены")
    
    # Проверяем структуру таблицы reports_history
    print("\n=== СТРУКТУРА ТАБЛИЦЫ reports_history ===")
    query = """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'reports_history' 
        ORDER BY ordinal_position
    """
    columns = db_provider._execute_query(query)
    if columns:
        print("Колонки таблицы:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}")
    
    db_provider.close()
    print("\n[OK] Проверка завершена")
    
except Exception as e:
    print(f"[ERROR] Ошибка: {e}")
    import traceback
    traceback.print_exc()
