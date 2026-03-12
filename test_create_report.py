#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Тест создания отчета через backend API
"""

import requests
import json

# Сначала логинимся, чтобы получить токен
def login():
    url = "http://localhost:8080/auth/login"
    payload = {
        "email": "GGG@aura.local",
        "password": "password123"
    }
    
    print("Логин...")
    response = requests.post(url, json=payload)
    print(f"Статус: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token') or data.get('access_token')
        print(f"Токен получен: {token[:20]}...")
        return token
    else:
        print(f"Ошибка логина: {response.text}")
        return None

def create_report(token):
    url = "http://localhost:8080/api/reports"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "date_from": "2026-01-01",
        "date_to": "2026-01-31"
    }
    
    print("\n" + "="*60)
    print("Отправка запроса на создание отчета...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("="*60)
    
    response = requests.post(url, headers=headers, json=payload)
    
    print(f"\nСтатус ответа: {response.status_code}")
    print(f"Заголовки ответа: {dict(response.headers)}")
    
    try:
        response_json = response.json()
        print(f"\nJSON ответ:")
        print(json.dumps(response_json, indent=2, ensure_ascii=False))
    except:
        print(f"\nТекст ответа: {response.text}")
    
    return response.status_code == 200

if __name__ == "__main__":
    token = login()
    if token:
        success = create_report(token)
        if success:
            print("\n[OK] Отчет успешно создан!")
        else:
            print("\n[ERROR] Не удалось создать отчет")
    else:
        print("\n[ERROR] Не удалось получить токен")
