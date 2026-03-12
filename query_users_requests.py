#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Вывод пользователей и их заявок на генерацию отчётов (report_requests)."""
import psycopg2
import os
from datetime import datetime, timezone

CONN_STRING = os.environ.get(
    "DATABASE_URL",
    "postgresql://aura:aura@localhost:5432/aura"
)

# Часовой пояс для отображения (None = локальное время ПК). Можно: REPORT_DISPLAY_TZ=Europe/Moscow
DISPLAY_TZ = os.environ.get("REPORT_DISPLAY_TZ", None)
# Если в БД уже сохранено локальное время, задайте REPORT_ASSUME_UTC=0 (по умолчанию считаем UTC)
ASSUME_UTC = os.environ.get("REPORT_ASSUME_UTC", "1").strip().lower() in ("1", "true", "yes")


def format_ts(val):
    """Форматирует timestamp: по умолчанию считаем значение в UTC, выводим в локальной зоне."""
    if val is None:
        return "NULL"
    if isinstance(val, datetime):
        if ASSUME_UTC and val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        if ASSUME_UTC:
            if DISPLAY_TZ:
                import zoneinfo
                val = val.astimezone(zoneinfo.ZoneInfo(DISPLAY_TZ))
            elif val.tzinfo:
                val = val.astimezone()
        return val.strftime("%Y-%m-%d %H:%M:%S")
    return str(val)


def row_str(row, ts_col_indexes):
    out = []
    for i, x in enumerate(row):
        if i in ts_col_indexes:
            out.append(format_ts(x))
        else:
            out.append(str(x) if x is not None else "NULL")
    return " | ".join(out)


def main():
    conn = psycopg2.connect(CONN_STRING)
    cur = conn.cursor()

    # --- Все пользователи из БД (с датой регистрации) ---
    print("=" * 60)
    print("Все пользователи (таблица users):\n")
    cur.execute("""
        SELECT user_id, username, email, created_at
        FROM users
        ORDER BY user_id;
    """)
    user_rows = cur.fetchall()
    user_cols = [d[0] for d in cur.description]
    user_ts_idx = {i for i, c in enumerate(user_cols) if c == "created_at"}
    print(" | ".join(user_cols))
    print("-" * 80)
    for row in user_rows:
        print(row_str(row, user_ts_idx))
    print(f"\nВсего пользователей: {len(user_rows)}")

    # --- Все мысли по пользователям (таблица thoughts) ---
    print("\n" + "=" * 60)
    print("Мысли всех пользователей (user_id | username | thought_id | created_at | текст до 80 символов):\n")
    cur.execute("""
        SELECT t.user_id, u.username, t.thought_id, t.created_at,
               LEFT(COALESCE(NULLIF(TRIM(t.content), ''), NULLIF(TRIM(t.voice_text), ''), '(пусто)'), 80) AS preview
        FROM thoughts t
        JOIN users u ON u.user_id = t.user_id
        ORDER BY t.user_id, t.created_at;
    """)
    thought_rows = cur.fetchall()
    thought_cols = [d[0] for d in cur.description]
    thought_ts_idx = {i for i, c in enumerate(thought_cols) if c == "created_at"}
    print(" | ".join(thought_cols))
    print("-" * 100)
    for row in thought_rows:
        print(row_str(row, thought_ts_idx))
    print(f"\nВсего мыслей: {len(thought_rows)}")

    # --- Пользователи и их заявки на отчёты (report_requests) ---
    print("\n" + "=" * 60)
    print("Пользователи и заявки на отчёты (report_requests):\n")
    cur.execute("""
        SELECT u.user_id, u.username, r.id AS request_id, r.date_from, r.date_to, r.requested_at
        FROM users u
        LEFT JOIN report_requests r ON u.user_id = r.user_id
        ORDER BY u.user_id, r.requested_at DESC NULLS LAST;
    """)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    ts_indexes = {i for i, c in enumerate(cols) if c == "requested_at"}
    print(" | ".join(cols))
    print("-" * 80)
    for row in rows:
        print(row_str(row, ts_indexes))
    print(f"\nВсего строк (пользователь-заявка): {len(rows)}")

    # --- Все заявки на отчёты (таблица report_requests) ---
    print("\n" + "=" * 60)
    print("Таблица report_requests (все заявки):\n")
    cur.execute("SELECT id, user_id, date_from, date_to, requested_at FROM report_requests ORDER BY user_id, requested_at DESC;")
    rows2 = cur.fetchall()
    cols2 = [d[0] for d in cur.description]
    ts_indexes2 = {i for i, c in enumerate(cols2) if c == "requested_at"}
    print(" | ".join(cols2))
    print("-" * 80)
    for row in rows2:
        print(row_str(row, ts_indexes2))
    print(f"\nВсего заявок на отчёты: {len(rows2)}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
