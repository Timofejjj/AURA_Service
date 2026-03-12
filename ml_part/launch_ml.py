import subprocess
import sys
import os

print("="*60)
print("ML Service Launcher")
print("="*60)

ml_path = r"D:\APP\Aura_App-main (3)\Aura_App-main\ml_part"
os.chdir(ml_path)

print(f"\nWorking directory: {os.getcwd()}")
print(f"Starting: python simple_ml.py\n")
print("="*60)

try:
    # Launch ML service in a new window
    subprocess.Popen(
        [sys.executable, "simple_ml.py"],
        creationflags=subprocess.CREATE_NEW_CONSOLE,
        cwd=ml_path
    )
    print("\n✓ ML Service launched successfully!")
    print("Check the new console window for ML Service output")
    
except Exception as e:
    print(f"\n✗ Error launching ML Service: {e}")
    sys.exit(1)

print("="*60)

