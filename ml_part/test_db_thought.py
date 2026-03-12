# Quick Test Script - Check if thought has type_thought in DB
# Run this to verify ML analysis worked

import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://aura:aura@localhost:5432/aura")
    cur = conn.cursor()
    
    # Check thought_id=8
    cur.execute("""
        SELECT thought_id, user_id, content, type_thought, sentiment_label, sentiment_score 
        FROM thoughts 
        WHERE thought_id = 8 AND user_id = 11
    """)
    
    result = cur.fetchone()
    if result:
        print("="*60)
        print("Thought ID 8 Status:")
        print("="*60)
        print(f"thought_id: {result[0]}")
        print(f"user_id: {result[1]}")
        print(f"content: {result[2][:50] if result[2] else 'None'}...")
        print(f"type_thought: {result[3]}")
        print(f"sentiment_label: {result[4]}")
        print(f"sentiment_score: {result[5]}")
        print("="*60)
        
        if result[3]:
            print("✓ type_thought IS SET - ML analysis worked!")
        else:
            print("✗ type_thought IS NULL - ML analysis did NOT work")
    else:
        print("✗ Thought ID 8 not found")
    
    # Check all thoughts for user 11
    cur.execute("""
        SELECT thought_id, type_thought, content 
        FROM thoughts 
        WHERE user_id = 11 
        ORDER BY thought_id DESC 
        LIMIT 5
    """)
    
    all_thoughts = cur.fetchall()
    print("\n" + "="*60)
    print("Last 5 thoughts for user 11:")
    print("="*60)
    for t in all_thoughts:
        print(f"ID {t[0]}: type_thought='{t[1]}' | content='{t[2][:30] if t[2] else 'None'}...'")
    print("="*60)
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

