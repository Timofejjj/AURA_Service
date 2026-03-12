#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test ML Service Startup"""

import sys
import os

print("="*50)
print("ML Service Startup Test")
print("="*50)

# Test 1: Python version
print(f"\n1. Python version: {sys.version}")

# Test 2: Required modules
print("\n2. Testing imports...")
try:
    import psycopg2
    print("   ✓ psycopg2")
except ImportError as e:
    print(f"   ✗ psycopg2: {e}")
    sys.exit(1)

try:
    import google.generativeai as genai
    print("   ✓ google-generativeai")
except ImportError as e:
    print(f"   ✗ google-generativeai: {e}")

try:
    import fastapi
    print("   ✓ fastapi")
except ImportError as e:
    print(f"   ✗ fastapi: {e}")
    sys.exit(1)

try:
    import uvicorn
    print("   ✓ uvicorn")
except ImportError as e:
    print(f"   ✗ uvicorn: {e}")
    sys.exit(1)

# Test 3: Database connection
print("\n3. Testing database connection...")
try:
    from db_provider import DatabaseDataProvider
    print("   ✓ db_provider module imported")
    
    db = DatabaseDataProvider()
    print("   ✓ Database connection successful!")
    
    db.close()
    print("   ✓ Database connection closed")
except Exception as e:
    print(f"   ✗ Database error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Try to import main_logic
print("\n4. Testing main_logic module...")
try:
    import main_logic
    print("   ✓ main_logic module imported")
    print(f"   ✓ FastAPI app: {main_logic.app}")
except Exception as e:
    print(f"   ✗ main_logic error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*50)
print("✓ ALL TESTS PASSED!")
print("ML Service should start successfully")
print("="*50)
print("\nStarting ML Service now...")
print("-"*50)

# Start the service
import uvicorn
uvicorn.run(main_logic.app, host="0.0.0.0", port=8000)

