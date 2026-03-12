#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Проверка мыслей за сегодня и вчера."""
import psycopg2
import os
from datetime import datetime

CONN_STRING = os.environ.get("DATABASE_URL", "postgresql://aura:aura@localhost:5432/aura")

conn = psycopg2.connect(CONN_STRING)
cur = conn.cursor()

now = datetime.now()
print(f"Текущее время: {now.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Текущий час: {now.hour}\n")

# Логика дня журнала
CUTOFF = 4
if now.hour < CUTOFF:
    print(f"⚠️  До {CUTOFF}:00 — показываем ВЧЕРАШНИЙ день\n")
else:
    print(f"✓ После {CUTOFF}:00 — показываем СЕГОДНЯШНИЙ день\n")

# Все мысли за последние 2 дня
cur.execute("""
    SELECT thought_id, user_id, LEFT(content, 60) as preview, created_at::text
    FROM thoughts
    WHERE created_at >= NOW() - INTERVAL '2 days'
    ORDER BY created_at DESC
    LIMIT 20;
""")

thoughts = cur.fetchall()
print(f"Найдено {len(thoughts)} мыслей за последние 2 дня:")
print("-" * 80)
for tid, uid, content, created in thoughts:
    print(f"ID {tid:<5} User {uid:<3} {created[:19]:<20} {content}")

# Статистика по дням
print("\n" + "=" * 80)
cur.execute("""
    SELECT DATE(created_at)::text as day, COUNT(*) as count
    FROM thoughts
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 5;
""")
stats = cur.fetchall()
print("Статистика по дням:")
for day, count in stats:
    print(f"  {day}: {count} мыслей")

cur.close()
conn.close()
print("\n✓ Готово")
