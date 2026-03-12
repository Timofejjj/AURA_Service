import sys
print("Python version:", sys.version)

try:
    import psycopg2
    print("✓ psycopg2 installed")
except ImportError as e:
    print("✗ psycopg2 NOT installed:", e)
    print("\nPlease install: pip install psycopg2-binary")
    sys.exit(1)

try:
    conn_string = "postgresql://aura:aura@localhost:5432/aura"
    print(f"\nTrying to connect to: {conn_string}")
    conn = psycopg2.connect(conn_string)
    print("✓ Connection successful!")
    conn.close()
except Exception as e:
    print(f"✗ Connection failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nAll checks passed! ML service should work now.")

