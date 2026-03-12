#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки генерации отчетов
"""

import sys
import os

# Добавляем путь к ml_part для импортов
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
from main_logic import run_analysis
from datetime import datetime, timedelta

def test_report_generation():
    """Тестирует генерацию отчета"""
    print("="*60)
    print("ТЕСТ ГЕНЕРАЦИИ ОТЧЕТА")
    print("="*60)
    
    # 1. Подключаемся к БД
    try:
        print("\n[1/4] Подключение к базе данных...")
        db_provider = DatabaseDataProvider()
        print("[OK] Подключение установлено")
    except Exception as e:
        print(f"[ERROR] Не удалось подключиться к БД: {e}")
        return
    
    # 2. Проверяем таблицу reports_history
    try:
        print("\n[2/4] Проверка таблицы reports_history...")
        query = "SELECT COUNT(*) as count FROM reports_history"
        result = db_provider._execute_query(query)
        count = result[0]['count'] if result else 0
        print(f"[OK] В таблице reports_history найдено отчетов: {count}")
        
        # Показываем последние 3 отчета
        query = "SELECT report_id, user_id, log_datetime, date_from, date_to FROM reports_history ORDER BY log_datetime DESC LIMIT 3"
        reports = db_provider._execute_query(query)
        if reports:
            print(f"\n[INFO] Последние отчеты:")
            for r in reports:
                print(f"  - Report ID: {r['report_id']}, User ID: {r['user_id']}, Date: {r['log_datetime']}")
        else:
            print("[INFO] Отчетов в БД не найдено")
            
    except Exception as e:
        print(f"[ERROR] Ошибка при проверке таблицы: {e}")
        import traceback
        traceback.print_exc()
    
    # 3. Проверяем наличие мыслей (thoughts)
    try:
        print("\n[3/4] Проверка мыслей (thoughts)...")
        query = "SELECT user_id, COUNT(*) as count FROM thoughts GROUP BY user_id ORDER BY count DESC LIMIT 5"
        result = db_provider._execute_query(query)
        if result:
            print("[OK] Найдены пользователи с мыслями:")
            for row in result:
                print(f"  - User ID: {row['user_id']}, Мыслей: {row['count']}")
            
            # Берем первого пользователя для теста
            test_user_id = result[0]['user_id']
            thoughts_count = result[0]['count']
            print(f"\n[INFO] Будем использовать User ID: {test_user_id} (мыслей: {thoughts_count})")
        else:
            print("[WARN] Мысли не найдены ни у одного пользователя")
            test_user_id = None
            
    except Exception as e:
        print(f"[ERROR] Ошибка при проверке мыслей: {e}")
        import traceback
        traceback.print_exc()
        test_user_id = None
    
    # 4. Пробуем сгенерировать отчет
    if test_user_id:
        try:
            print(f"\n[4/4] Генерация тестового отчета для User ID: {test_user_id}...")
            
            # Диапазон: последние 30 дней
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            date_from_str = start_date.strftime("%Y-%m-%d")
            date_to_str = end_date.strftime("%Y-%m-%d")
            
            print(f"[INFO] Диапазон дат: {date_from_str} - {date_to_str}")
            print("[INFO] Запуск генерации отчета...")
            print("[INFO] Это может занять 30-60 секунд...")
            
            # Запускаем генерацию отчета
            run_analysis(db_provider, test_user_id, date_from_str, date_to_str)
            
            print("\n[OK] Генерация отчета завершена!")
            print("[INFO] Проверяем, сохранился ли отчет...")
            
            # Проверяем, появился ли новый отчет
            query = "SELECT report_id, log_datetime FROM reports_history WHERE user_id = %s ORDER BY log_datetime DESC LIMIT 1"
            result = db_provider._execute_query(query, (test_user_id,))
            if result:
                latest_report = result[0]
                print(f"[OK] Последний отчет для User ID {test_user_id}:")
                print(f"  - Report ID: {latest_report['report_id']}")
                print(f"  - Дата создания: {latest_report['log_datetime']}")
            else:
                print(f"[WARN] Отчет не найден для User ID {test_user_id}")
                
        except Exception as e:
            print(f"[ERROR] Ошибка при генерации отчета: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("\n[4/4] Пропускаем генерацию отчета (нет подходящего пользователя)")
    
    # Закрываем соединение
    db_provider.close()
    print("\n" + "="*60)
    print("ТЕСТ ЗАВЕРШЕН")
    print("="*60)

if __name__ == "__main__":
    test_report_generation()
