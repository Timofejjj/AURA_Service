#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Show users count with names, thoughts count, reports count per user."""

import os
import sys

# Load config.env
config_path = os.path.join(os.path.dirname(__file__), 'config.env')
if os.path.exists(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip())

import psycopg2
from psycopg2.extras import RealDictCursor

conn_string = os.getenv('DATABASE_URL') or os.getenv('CONN_STRING') or 'postgresql://aura:aura@localhost:5432/aura'

query = """
SELECT 
    u.user_id,
    u.username,
    u.email,
    (SELECT COUNT(*) FROM thoughts t WHERE t.user_id = u.user_id) AS thoughts_count,
    (SELECT COUNT(*) FROM reports_history r WHERE r.user_id = u.user_id) AS reports_count
FROM users u
ORDER BY u.user_id;
"""

try:
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)

print("=" * 60)
print("Users in database (with names, thoughts, reports)")
print("=" * 60)
print(f"{'user_id':<10} {'username':<20} {'thoughts':<10} {'reports':<10}")
print("-" * 60)

total_users = 0
total_thoughts = 0
total_reports = 0

for r in rows:
    uid = r['user_id']
    username = (r['username'] or '')[:18]
    thoughts = r['thoughts_count'] or 0
    reports = r['reports_count'] or 0
    total_users += 1
    total_thoughts += thoughts
    total_reports += reports
    print(f"{uid:<10} {username:<20} {thoughts:<10} {reports:<10}")

print("-" * 60)
print(f"Total users: {total_users}")
print(f"Total thoughts: {total_thoughts}")
print(f"Total reports: {total_reports}")
print("=" * 60)
