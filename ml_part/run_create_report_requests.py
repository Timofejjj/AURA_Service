#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Один раз создать таблицу report_requests."""

import os
import sys

config_path = os.path.join(os.path.dirname(__file__), 'config.env')
if os.path.exists(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip())

import psycopg2

conn_string = os.getenv('DATABASE_URL') or os.getenv('CONN_STRING') or 'postgresql://aura:aura@localhost:5432/aura'

sql = """
CREATE TABLE IF NOT EXISTS report_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_requests_user ON report_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_requested ON report_requests(requested_at DESC);
"""

try:
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    cur.close()
    conn.close()
    print("OK: Таблица report_requests создана (или уже существовала).")
except Exception as e:
    print("Ошибка:", e, file=sys.stderr)
    sys.exit(1)
