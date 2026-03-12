#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Добавить колонку role в users и назначить Tima админом."""

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
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET role = 'admin' WHERE LOWER(username) = 'tima';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
"""

try:
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'")
    cur.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
    cur.execute("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'tima'")
    cur.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
    cur.close()
    conn.close()
    print("OK: Role column added, Tima set to admin.")
except Exception as e:
    print("Error:", e, file=sys.stderr)
    sys.exit(1)
