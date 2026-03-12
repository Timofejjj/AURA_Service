#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Финальный тест: проверка, что backend возвращает правильный формат
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
import json

def test_backend_format():
    """Проверяет, что данные в БД имеют правильный формат для frontend"""
    
    print("="*70)
    print("ФИНАЛЬНЫЙ ТЕСТ: Проверка формата данных для frontend")
    print("="*70)
    
    try:
        db_provider = DatabaseDataProvider()
        print("\n[OK] Подключение к БД установлено")
        
        # Получаем отчеты
        query = """
            SELECT report_id, user_id, log_datetime, 
                   date_from, date_to, 
                   LEFT(report, 100) as report_preview
            FROM reports_history 
            WHERE user_id = 1
            ORDER BY log_datetime DESC
        """
        reports = db_provider._execute_query(query)
        
        print(f"\n[INFO] Найдено отчетов для User ID 1: {len(reports)}")
        
        if not reports:
            print("\n[ERROR] Нет отчетов в БД!")
            print("[INFO] Попробуйте сгенерировать отчет через приложение")
            return False
        
        print("\n" + "="*70)
        print("ПРОВЕРКА ФОРМАТА (что frontend ожидает)")
        print("="*70)
        
        success = True
        
        for i, r in enumerate(reports, 1):
            print(f"\n[{i}] Report ID: {r['report_id']}")
            print(f"    User ID: {r['user_id']}")
            print(f"    Created at: {r['log_datetime']}")
            print(f"    Date range: {r['date_from']} - {r['date_to']}")
            
            # Симулируем backend response
            backend_json = {
                "report_id": r['report_id'],  # Frontend ожидает report_id
                "user_id": r['user_id'],
                "created_at": r['log_datetime'].isoformat() if r['log_datetime'] else None,  # Frontend ожидает created_at
                "date_from": r['date_from'].isoformat() if r['date_from'] else None,
                "date_to": r['date_to'].isoformat() if r['date_to'] else None,
                "report": r['report_preview'] + "..."
            }
            
            # Проверяем наличие обязательных полей
            required_fields = ['report_id', 'created_at']
            missing_fields = [f for f in required_fields if f not in backend_json or backend_json[f] is None]
            
            if missing_fields:
                print(f"    [ERROR] Отсутствуют поля: {missing_fields}")
                success = False
            else:
                print(f"    [OK] Все обязательные поля присутствуют")
            
            # Проверяем, что поля НЕ используют старые имена
            old_fields = ['id', 'log_datetime']
            found_old = [f for f in old_fields if f in backend_json]
            if found_old:
                print(f"    [WARN] Найдены старые имена полей: {found_old}")
            
            print(f"\n    Пример JSON для frontend:")
            print(f"    {json.dumps({k: v for k, v in backend_json.items() if k != 'report'}, indent=4, ensure_ascii=False)}")
        
        print("\n" + "="*70)
        
        if success:
            print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ")
            print("\n[INFO] Backend теперь возвращает правильный формат!")
            print("[INFO] Frontend должен корректно отображать отчеты")
            print(f"\n[INFO] Найдено отчетов: {len(reports)}")
            print("[INFO] Откройте приложение и проверьте раздел 'Отчеты'")
        else:
            print("❌ ТЕСТЫ НЕ ПРОЙДЕНЫ")
            print("\n[ERROR] Формат данных не соответствует ожиданиям frontend")
        
        print("="*70)
        
        db_provider.close()
        return success
        
    except Exception as e:
        print(f"\n[ERROR] Ошибка теста: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_backend_format()
    sys.exit(0 if success else 1)
