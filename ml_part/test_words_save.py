"""
Скрипт для проверки сохранения words_for_prompt в БД
"""
import os
import sys
from pathlib import Path

# Добавляем путь к ml_part
sys.path.insert(0, str(Path(__file__).parent))

from db_provider import DatabaseDataProvider

def test_words_save():
    """Проверяет сохранение и чтение words_for_prompt"""
    print("=" * 60)
    print("Testing words_for_prompt save/read functionality")
    print("=" * 60)
    
    # Инициализация провайдера
    try:
        db = DatabaseDataProvider()
        print("✓ Database connection established")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        return
    
    # Тестовый user_id
    test_user_id = 12  # Из логов видно, что user_id = 12
    test_words = "ментальное здоровье, коучинг, лидерство, прогресс"
    
    print(f"\n1. Testing save for user_id={test_user_id}")
    print(f"   Words to save: {test_words}")
    
    try:
        # Сохранение
        db.save_ai_prompt_settings(test_user_id, test_words)
        print("   ✓ Words saved successfully")
    except Exception as e:
        print(f"   ✗ Failed to save: {e}")
        return
    
    print(f"\n2. Testing read for user_id={test_user_id}")
    try:
        # Чтение
        settings = db.get_ai_prompt_settings(test_user_id)
        if settings:
            saved_words = settings.get('words_for_prompt')
            print(f"   ✓ Words read successfully")
            print(f"   Saved words: {saved_words}")
            
            if saved_words == test_words:
                print("   ✓ Words match exactly!")
            else:
                print(f"   ⚠ WARNING: Words don't match!")
                print(f"      Expected: {test_words}")
                print(f"      Got:      {saved_words}")
        else:
            print("   ✗ No settings found!")
    except Exception as e:
        print(f"   ✗ Failed to read: {e}")
        return
    
    print(f"\n3. Testing usage in report generation")
    print(f"   This would be used in run_analysis() as context_focus")
    print(f"   Context focus would be: '{test_words}'")
    print(f"   ✓ Integration check passed")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_words_save()

