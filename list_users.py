#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Вывод всех пользователей из таблицы users."""
import psycopg2
import os
from datetime import datetime, timezone

CONN_STRING = os.environ.get(
    "DATABASE_URL",
    "postgresql://aura:aura@localhost:5432/aura"
)

def main():
    conn = psycopg2.connect(CONN_STRING)
    cur = conn.cursor()
    cur.execute("""
        SELECT user_id, username, email, role, created_at
        FROM users
        ORDER BY user_id;
    """)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    print("Пользователи (таблица users)\n")
    print(" | ".join(cols))
    print("-" * 60)
    for row in rows:
        print(" | ".join(str(x) if x is not None else "NULL" for x in row))
    print(f"\nВсего пользователей: {len(rows)}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
