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

# Очищаем таблицу thoughts
cur.execute("DELETE FROM thoughts;")
deleted_count = cur.rowcount

# Коммитим изменения
conn.commit()

print(f"OK: Deleted {deleted_count} thoughts from thoughts table")

cur.close()
conn.close()

