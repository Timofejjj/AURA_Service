#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Re-analyze all thoughts without type_thought
Повторный анализ всех мыслей без категории
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
from main_logic import analyze_thought

def re_analyze_all_thoughts(user_id: int):
    """Повторно анализирует все мысли пользователя без type_thought"""
    db = DatabaseDataProvider()
    
    try:
        # Получаем все мысли без type_thought
        query = """
            SELECT thought_id, content, voice_text 
            FROM thoughts 
            WHERE user_id = %s 
            AND (type_thought IS NULL OR type_thought = '')
            AND (content IS NOT NULL OR voice_text IS NOT NULL)
            ORDER BY thought_id
        """
        result = db._execute_query(query, (user_id,))
        
        if not result:
            print(f"Нет мыслей для анализа у пользователя {user_id}")
            return
        
        print(f"Найдено {len(result)} мыслей без type_thought для пользователя {user_id}")
        print("="*60)
        
        for row in result:
            thought_id = row['thought_id']
            content = row.get('content') or row.get('voice_text') or ''
            
            if not content or not content.strip():
                print(f"SKIP [ID {thought_id}]: Нет текста")
                continue
            
            print(f"\n>>> Анализ мысли ID {thought_id}")
            print(f"Текст: {content[:50]}...")
            
            try:
                analyze_thought(db, user_id, thought_id)
                print(f"[OK] Мысль {thought_id} проанализирована")
            except Exception as e:
                print(f"[ERROR] Ошибка при анализе мысли {thought_id}: {e}")
                import traceback
                traceback.print_exc()
        
        print("\n" + "="*60)
        print("Анализ завершен!")
        
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python re_analyze_thoughts.py <user_id>")
        print("Пример: python re_analyze_thoughts.py 11")
        sys.exit(1)
    
    user_id = int(sys.argv[1])
    re_analyze_all_thoughts(user_id)

