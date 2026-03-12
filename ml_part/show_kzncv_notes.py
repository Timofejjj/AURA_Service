# -*- coding: utf-8 -*-
import os
import sys

if os.path.exists(os.path.join(os.path.dirname(__file__), 'config.env')):
    with open(os.path.join(os.path.dirname(__file__), 'config.env')) as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ.setdefault(k, v)

import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://aura:aura@localhost:5432/aura'))
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("""
  SELECT thought_id, created_at, content, voice_text, type_thought, sentiment_label
  FROM thoughts WHERE user_id = 7 ORDER BY created_at DESC
""")
rows = cur.fetchall()
conn.close()

out = []
out.append("=" * 70)
out.append("Notices (thoughts) of user Kzncv (user_id=7)")
out.append("=" * 70)
for r in rows:
    text = (r['content'] or r['voice_text'] or '').strip()
    created = r['created_at'].strftime('%Y-%m-%d %H:%M') if r['created_at'] else '-'
    out.append("---")
    out.append("ID: {} | {} | type: {} | sentiment: {}".format(
        r['thought_id'], created, r['type_thought'] or '-', r['sentiment_label'] or '-'
    ))
    out.append(text or "(empty)")
out.append("=" * 70)
out.append("Total: {} notes".format(len(rows)))

result = "\n".join(out)
# Write UTF-8 file
with open(os.path.join(os.path.dirname(__file__), 'kzncv_notes_utf8.txt'), 'w', encoding='utf-8') as f:
    f.write(result)
print(result)
