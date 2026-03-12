#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Детальная проверка отчетов в БД
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
import json

try:
    print("="*60)
    print("ПРОВЕРКА ОТЧЕТОВ В БД")
    print("="*60)
    
    db_provider = DatabaseDataProvider()
    print("\n[OK] Подключение к БД установлено\n")
    
    # Получаем все отчеты
    query = """
        SELECT report_id, user_id, log_datetime, 
               date_from, date_to,
               LENGTH(report) as report_length
        FROM reports_history 
        ORDER BY log_datetime DESC
    """
    reports = db_provider._execute_query(query)
    
    print(f"Найдено отчетов: {len(reports)}\n")
    
    if reports:
        print("Список отчетов:")
        print("-" * 60)
        for r in reports:
            print(f"Report ID: {r['report_id']}")
            print(f"  User ID: {r['user_id']}")
            print(f"  Created: {r['log_datetime']}")
            print(f"  Date Range: {r['date_from']} - {r['date_to']}")
            print(f"  Report Length: {r['report_length']} символов")
            print()
        
        # Получаем детали первого отчета
        first_report_id = reports[0]['report_id']
        print(f"\n{'='*60}")
        print(f"ДЕТАЛИ ОТЧЕТА ID={first_report_id}")
        print("="*60)
        
        query = """
            SELECT report_id, user_id, log_datetime, 
                   date_from, date_to, report
            FROM reports_history 
            WHERE report_id = %s
        """
        detail = db_provider._execute_query(query, (first_report_id,))
        
        if detail:
            r = detail[0]
            print(f"\nReport ID: {r['report_id']}")
            print(f"User ID: {r['user_id']}")
            print(f"Created: {r['log_datetime']}")
            print(f"Date From: {r['date_from']}")
            print(f"Date To: {r['date_to']}")
            print(f"\nReport Content (first 500 chars):")
            print("-" * 60)
            try:
                report_text = r['report'][:500]
                print(report_text)
            except:
                print(r['report'][:500].encode('utf-8', errors='replace').decode('utf-8'))
            print("-" * 60)
            
            # Проверяем, есть ли Markdown заголовки
            if '##' in r['report']:
                print("\n[OK] Отчет содержит Markdown форматирование (##)")
            else:
                print("\n[WARN] Отчет не содержит Markdown заголовки")
            
            # Формируем JSON как бы от backend
            backend_response = {
                "id": r['report_id'],
                "user_id": r['user_id'],
                "log_datetime": r['log_datetime'].isoformat() if r['log_datetime'] else None,
                "report": r['report'][:100] + "..." if len(r['report']) > 100 else r['report'],
                "date_from": r['date_from'].isoformat() if r['date_from'] else None,
                "date_to": r['date_to'].isoformat() if r['date_to'] else None,
            }
            
            print(f"\n{'='*60}")
            print("СИМУЛЯЦИЯ BACKEND ОТВЕТА (JSON):")
            print("="*60)
            print(json.dumps(backend_response, indent=2, ensure_ascii=False))
            
    else:
        print("[WARN] Отчеты не найдены")
    
    db_provider.close()
    print(f"\n{'='*60}")
    print("[OK] Проверка завершена")
    print("="*60)
    
except Exception as e:
    print(f"\n[ERROR] Ошибка: {e}")
    import traceback
    traceback.print_exc()
