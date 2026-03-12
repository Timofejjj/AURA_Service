#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test Gemini API and Thought Analysis"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_provider import DatabaseDataProvider
from main_logic import analyze_thought, conect_llm
import time

print("="*60)
print("Testing Gemini API and Thought Analysis")
print("="*60)

# 1. Test Gemini API connection
print("\n[1/3] Testing Gemini API connection...")
model = conect_llm()
if not model:
    print("✗ FAILED: Cannot connect to Gemini API")
    print("Check your GEMINI_API_KEY in config.env")
    sys.exit(1)
print("OK: Gemini API connected successfully")

# 2. Test database connection
print("\n[2/3] Testing database connection...")
try:
    db = DatabaseDataProvider()
    print("OK: Database connected")
except Exception as e:
    print(f"✗ FAILED: Cannot connect to database: {e}")
    sys.exit(1)

# 3. Test analysis for thought_id=1
print("\n[3/3] Testing analysis for thought_id=1...")
try:
    # Get thought text first
    text = db.get_thought_text(1)
    if not text:
        print("✗ Thought ID 1 has no text content")
        sys.exit(1)
    
    print(f"Thought text: {text[:50]}...")
    print("Running analysis (this may take 10-20 seconds)...")
    
    # Run analysis synchronously (not in background)
    analyze_thought(db, 11, 1)
    
    # Check if type_thought was saved
    time.sleep(2)  # Give it a moment
    check_query = "SELECT type_thought, sentiment_label FROM thoughts WHERE thought_id = 1"
    result = db._execute_query(check_query, ())
    
    if result and result[0].get('type_thought'):
        print(f"\nSUCCESS! Analysis completed!")
        print(f"   type_thought: {result[0].get('type_thought')}")
        print(f"   sentiment_label: {result[0].get('sentiment_label')}")
    else:
        print("\n✗ FAILED: Analysis did not save type_thought")
        print("Check ML service logs for errors")
    
except Exception as e:
    print(f"\n✗ ERROR during analysis: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

db.close()
print("\n" + "="*60)
print("Test completed")
print("="*60)

