import psycopg2
import os

# Подключение к БД
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="aura",
    user="aura",
    password="aura"
)

cur = conn.cursor()

# Проверяем мысль 15
cur.execute("SELECT thought_id, user_id, content, type_thought, sentiment_label, sentiment_score, created_at FROM thoughts WHERE thought_id = 15")
row = cur.fetchone()

if row:
    print(f"Thought 15 found:")
    print(f"  thought_id: {row[0]}")
    print(f"  user_id: {row[1]}")
    print(f"  content: {row[2]}")
    print(f"  type_thought: {row[3]} (NULL if None)")
    print(f"  sentiment_label: {row[4]} (NULL if None)")
    print(f"  sentiment_score: {row[5]} (NULL if None)")
    print(f"  created_at: {row[6]}")
    
    if row[3] is None:
        print("\n!!! PROBLEM: type_thought is NULL - ML analysis did not save!")
    else:
        print(f"\nOK: type_thought = '{row[3]}'")
else:
    print("Thought 15 NOT FOUND in database")

cur.close()
conn.close()

