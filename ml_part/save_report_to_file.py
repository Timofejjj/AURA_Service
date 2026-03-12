#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Сохранение отчета в файл
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
import json

try:
    db_provider = DatabaseDataProvider()
    
    # Получаем последний отчет
    query = """
        SELECT report_id, user_id, log_datetime, 
               date_from, date_to, report
        FROM reports_history 
        ORDER BY log_datetime DESC
        LIMIT 1
    """
    result = db_provider._execute_query(query)
    
    if result:
        r = result[0]
        
        # Сохраняем отчет в файл
        output_file = "latest_report.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"# Report ID: {r['report_id']}\n")
            f.write(f"User ID: {r['user_id']}\n")
            f.write(f"Created: {r['log_datetime']}\n")
            f.write(f"Date Range: {r['date_from']} - {r['date_to']}\n")
            f.write(f"\n---\n\n")
            f.write(r['report'])
        
        print(f"Report saved to: {os.path.abspath(output_file)}")
        print(f"\nReport ID: {r['report_id']}")
        print(f"Report length: {len(r['report'])} characters")
        
        # Сохраняем JSON представление как backend
        json_output = "backend_response.json"
        backend_data = {
            "id": r['report_id'],
            "user_id": r['user_id'],
            "log_datetime": r['log_datetime'].isoformat() if r['log_datetime'] else None,
            "report": r['report'],
            "date_from": r['date_from'].isoformat() if r['date_from'] else None,
            "date_to": r['date_to'].isoformat() if r['date_to'] else None,
        }
        
        with open(json_output, 'w', encoding='utf-8') as f:
            json.dump(backend_data, f, indent=2, ensure_ascii=False)
        
        print(f"Backend JSON saved to: {os.path.abspath(json_output)}")
        
    else:
        print("No reports found")
    
    db_provider.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
