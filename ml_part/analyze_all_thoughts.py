#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Analyze all unanalyzed thoughts for a user"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
from main_logic import analyze_thought, conect_llm
import time

def analyze_all_thoughts_for_user(user_id: int):
    """Analyze all thoughts without type_thought for a user"""
    
    print("="*60)
    print(f"Analyzing all unanalyzed thoughts for user_id={user_id}")
    print("="*60)
    
    # 1. Check Gemini API
    print("\n[1/4] Checking Gemini API...")
    model = conect_llm()
    if not model:
        print("ERROR: Gemini API not available!")
        print("Please check GEMINI_API_KEY in config.env")
        return False
    print("OK: Gemini API connected")
    
    # 2. Connect to database
    print("\n[2/4] Connecting to database...")
    try:
        db = DatabaseDataProvider()
        print("OK: Database connected")
    except Exception as e:
        print(f"ERROR: Cannot connect to database: {e}")
        return False
    
    # 3. Get all unanalyzed thoughts
    print("\n[3/4] Finding unanalyzed thoughts...")
    try:
        query = "SELECT thought_id, content FROM thoughts WHERE user_id = %s AND (type_thought IS NULL OR type_thought = '') ORDER BY thought_id"
        result = db._execute_query(query, (user_id,))
        
        if not result:
            print("OK: No unanalyzed thoughts found")
            db.close()
            return True
        
        thought_ids = [row['thought_id'] for row in result]
        print(f"Found {len(thought_ids)} unanalyzed thoughts: {thought_ids}")
    except Exception as e:
        print(f"ERROR: Cannot get thoughts: {e}")
        db.close()
        return False
    
    # 4. Analyze each thought
    print(f"\n[4/4] Analyzing {len(thought_ids)} thoughts...")
    print("This may take 5-10 seconds per thought...")
    print("-"*60)
    
    success_count = 0
    error_count = 0
    
    for i, thought_id in enumerate(thought_ids, 1):
        print(f"\n[{i}/{len(thought_ids)}] Analyzing thought_id={thought_id}...")
        try:
            analyze_thought(db, user_id, thought_id)
            
            # Verify it was saved
            time.sleep(1)  # Give DB a moment
            verify_query = "SELECT type_thought FROM thoughts WHERE thought_id = %s AND user_id = %s"
            verify_result = db._execute_query(verify_query, (thought_id, user_id))
            
            if verify_result and verify_result[0].get('type_thought'):
                print(f"OK: Thought {thought_id} analyzed successfully! type_thought='{verify_result[0].get('type_thought')}'")
                success_count += 1
            else:
                print(f"WARNING: Thought {thought_id} analysis did not save type_thought")
                error_count += 1
                
        except Exception as e:
            print(f"ERROR: Failed to analyze thought {thought_id}: {e}")
            error_count += 1
            import traceback
            traceback.print_exc()
    
    db.close()
    
    print("\n" + "="*60)
    print("Analysis complete!")
    print(f"Successfully analyzed: {success_count}")
    print(f"Errors: {error_count}")
    print("="*60)
    
    return success_count > 0

if __name__ == "__main__":
    user_id = 11  # Change this to your user_id
    
    if len(sys.argv) > 1:
        try:
            user_id = int(sys.argv[1])
        except:
            print(f"Invalid user_id: {sys.argv[1]}. Using default: {user_id}")
    
    success = analyze_all_thoughts_for_user(user_id)
    sys.exit(0 if success else 1)

