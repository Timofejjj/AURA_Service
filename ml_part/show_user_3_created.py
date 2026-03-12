#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sys
config_path = os.path.join(os.path.dirname(__file__), 'config.env')
if os.path.exists(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
import psycopg2
from psycopg2.extras import RealDictCursor
conn_string = os.getenv('DATABASE_URL') or os.getenv('CONN_STRING') or 'postgresql://aura:aura@localhost:5432/aura'
conn = psycopg2.connect(conn_string)
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute('SELECT user_id, username, email, created_at FROM users WHERE user_id = 3')
row = cur.fetchone()
cur.close()
conn.close()
if row:
    print('Юля (user_id=3, юля@aura.local)')
    print('Дата регистрации:', row['created_at'])
else:
    print('User not found')
