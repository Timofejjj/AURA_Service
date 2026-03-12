#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Удаление всех заявок на отчёт (report_requests) для пользователя DjimFild (user_id=11)."""
import os
import psycopg2

CONN_STRING = os.environ.get(
    "DATABASE_URL",
    "postgresql://aura:aura@localhost:5432/aura"
)

USER_ID = 11  # DjimFild

def main():
    conn = psycopg2.connect(CONN_STRING)
    cur = conn.cursor()
    cur.execute("DELETE FROM report_requests WHERE user_id = %s RETURNING id", (USER_ID,))
    deleted = cur.fetchall()
    conn.commit()
    count = len(deleted)
    cur.close()
    conn.close()
    print(f"OK: Удалено заявок на отчёт для user_id={USER_ID} (DjimFild): {count}")

if __name__ == "__main__":
    main()
