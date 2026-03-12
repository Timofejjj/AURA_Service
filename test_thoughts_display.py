#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Проверка отображения мыслей: показывает мысли за последние 2 дня с датами."""
import psycopg2
import os
from datetime import datetime, timezone, timedelta

CONN_STRING = os.environ.get(
    "DATABASE_URL",
    "postgresql://aura:aura@localhost:5432/aura"
)

try:
    conn = psycopg2.connect(CONN_STRING)
    cur = conn.cursor()

    print("=" * 80)
    print("ПРОВЕРКА МЫСЛЕЙ ЗА ПОСЛЕДНИЕ 2 ДНЯ")
    print("=" * 80)
    
    # Получаем текущее время
    now = datetime.now()
    print(f"\nТекущее время: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Текущий час: {now.hour}")
    
    # Логика "дня журнала" (как на фронтенде)
    JOURNAL_DAY_CUTOFF_HOUR = 4
    if now.hour < JOURNAL_DAY_CUTOFF_HOUR:
        display_day = now.date() - timedelta(days=1)
        print(f"⚠️  Сейчас {now.hour}:00 (до 4:00) — показываем ВЧЕРАШНИЙ день")
    else:
        display_day = now.date()
        print(f"✓ Сейчас {now.hour}:00 (после 4:00) — показываем СЕГОДНЯШНИЙ день")
    
    print(f"День журнала для отображения: {display_day}")
    
    # Получаем мысли за последние 2 дня
    two_days_ago = now - timedelta(days=2)
    
    cur.execute("""
        SELECT 
            thought_id,
            user_id,
            content,
            created_at,
            DATE(created_at) as date_only
        FROM thoughts
        WHERE created_at >= %s
        ORDER BY created_at DESC
        LIMIT 50;
    """, (two_days_ago,))
    
    thoughts = cur.fetchall()
    
    if not thoughts:
        print("\n⚠️  НЕТ МЫСЛЕЙ ЗА ПОСЛЕДНИЕ 2 ДНЯ!")
        print("Проверьте, есть ли вообще мысли в БД:")
        cur.execute("SELECT COUNT(*) FROM thoughts")
        total = cur.fetchone()[0]
        print(f"Всего мыслей в БД: {total}")
        
        if total > 0:
            cur.execute("SELECT thought_id, user_id, created_at FROM thoughts ORDER BY created_at DESC LIMIT 5")
            recent = cur.fetchall()
            print("\nПоследние 5 мыслей:")
            for t in recent:
                print(f"  ID {t[0]}, User {t[1]}, Дата: {t[2]}")
    else:
        print(f"\n✓ Найдено {len(thoughts)} мыслей за последние 2 дня\n")
        print(f"{'ID':<8} {'User':<8} {'Дата':<12} {'Время':<8} {'День журнала?':<18} {'Содержание':<50}")
        print("-" * 110)
        
        for t in thoughts:
            thought_id, user_id, content, created_at, date_only = t
            
            # Проверяем, попадает ли эта мысль в "день журнала"
            if date_only == display_day:
                is_display_day = "✓ ДА (текущий)"
            else:
                is_display_day = "нет (архив)"
            
            content_preview = (content[:47] + "...") if len(content) > 50 else content
            content_preview = content_preview.replace('\n', ' ')
            
            print(f"{thought_id:<8} {user_id:<8} {date_only!s:<12} {created_at.strftime('%H:%M:%S'):<8} {is_display_day:<18} {content_preview:<50}")
    
    # Подсчёт по дням
    print("\n" + "=" * 80)
    print("СТАТИСТИКА ПО ДНЯМ:")
    print("=" * 80)
    cur.execute("""
        SELECT DATE(created_at) as day, COUNT(*) as count, MIN(created_at) as first, MAX(created_at) as last
        FROM thoughts
        WHERE created_at >= %s
        GROUP BY DATE(created_at)
        ORDER BY day DESC;
    """, (two_days_ago,))
    
    stats = cur.fetchall()
    for day, count, first, last in stats:
        marker = "→ ДЕНЬ ЖУРНАЛА" if day == display_day else "  (архив)"
        print(f"{day}: {count} мыслей ({first.strftime('%H:%M')} - {last.strftime('%H:%M')}) {marker}")
    
    cur.close()
    conn.close()
    
    print("\n✓ Проверка завершена")

except Exception as e:
    print(f"❌ ОШИБКА: {e}")
    import traceback
    traceback.print_exc()
