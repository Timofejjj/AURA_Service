#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Тест API вызова для получения отчетов
"""

import requests
import json

try:
    print("Тестирование API получения отчетов...")
    
    # 1. Проверяем backend API без авторизации (может быть требуется токен)
    url = "http://localhost:8080/api/reports?user_id=1&limit=10"
    print(f"\nЗапрос: {url}")
    
    response = requests.get(url, timeout=10)
    print(f"Статус: {response.status_code}")
    print(f"Заголовки: {dict(response.headers)}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"\nJSON ответ:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except:
            print(f"\nТекст ответа: {response.text}")
    else:
        print(f"\nОшибка: {response.text}")
    
except Exception as e:
    print(f"Ошибка: {e}")
    import traceback
    traceback.print_exc()
