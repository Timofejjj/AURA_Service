#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Один общий скрипт запуска: Backend + ML + Frontend
Запуск: python start_all.py
Приложение: https://aura-app.tail8dfcfc.ts.net/app.html
Локально: http://localhost:5173/app.html
"""

import os
import sys
import time
import subprocess
import socket
from typing import Optional

ROOT = os.path.dirname(os.path.abspath(__file__))

def _wait_port(host: str, port: int, timeout_s: float) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1.0):
                return True
        except OSError:
            time.sleep(0.5)
    return False

def _run(cmd: list[str], *, cwd: str, title: Optional[str] = None, capture_stderr: bool = False) -> subprocess.Popen:
    """
    Запускает процесс. Если capture_stderr=True, stderr можно прочитать при падении процесса.
    """
    kw = {"cwd": cwd}
    if capture_stderr:
        kw["stderr"] = subprocess.PIPE
    is_windows = sys.platform == "win32"
    if is_windows:
        flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
        kw["creationflags"] = flags
    else:
        kw["start_new_session"] = True
    return subprocess.Popen(cmd, **kw)

def main():
    print()
    print("========================================")
    print("  Aura App — запуск всех сервисов")
    print("========================================")
    print("  Backend (Go):     http://localhost:8080")
    print("  ML (Python):      http://localhost:8000")
    print("  Frontend (Vite):  http://localhost:5173")
    print("  Приложение:       https://aura-app.tail8dfcfc.ts.net/app.html")
    print("========================================")
    print()

    backend_dir = os.path.join(ROOT, "backend")
    ml_dir = os.path.join(ROOT, "ml_part")
    frontend_dir = os.path.join(ROOT, "frontend")

    if not os.path.isdir(backend_dir):
        print("[ERROR] Папка backend не найдена:", backend_dir)
        sys.exit(1)
    if not os.path.isdir(ml_dir):
        print("[ERROR] Папка ml_part не найдена:", ml_dir)
        sys.exit(1)
    if not os.path.isdir(frontend_dir):
        print("[ERROR] Папка frontend не найдена:", frontend_dir)
        sys.exit(1)
    if not os.path.isfile(os.path.join(frontend_dir, "package.json")):
        print("[ERROR] В frontend не найден package.json.")
        sys.exit(1)

    # 1) Backend (go run может долго компилировать + подключение к БД)
    print("[1/3] Запуск Backend (порт 8080), ждём до 45 сек...")
    p_backend = _run(["go", "run", "./cmd/api/main.go"], cwd=backend_dir, capture_stderr=True)
    if not _wait_port("127.0.0.1", 8080, timeout_s=45):
        print("[ERROR] Backend не поднялся на порту 8080.")
        if p_backend.poll() is not None and getattr(p_backend, "stderr", None):
            err = p_backend.stderr.read().decode("utf-8", errors="replace").strip()
            if err:
                print("Вывод Backend (ошибка):")
                print(err)
        print("Проверьте: Go установлен, есть backend/app.env, БД запущена, ключи в backend/keys/.")
        try:
            p_backend.terminate()
        except Exception:
            pass
        sys.exit(1)
    print("[OK] Backend слушает 8080")

    # 2) ML
    print("[2/3] Запуск ML-сервиса (порт 8000)...")
    python_exe = sys.executable
    p_ml = _run([python_exe, "main_logic.py"], cwd=ml_dir, title="ML Service — 8000")
    if not _wait_port("127.0.0.1", 8000, timeout_s=25):
        print("[ERROR] ML-сервис не поднялся на порту 8000.")
        print("Обычно причина: не установлены зависимости `ml_part/requirements.txt` или нет `ml_part/config.env`.")
        try:
            p_ml.terminate()
        except Exception:
            pass
        try:
            p_backend.terminate()
        except Exception:
            pass
        sys.exit(1)
    print("[OK] ML-сервис слушает 8000")

    # 3) Frontend (на Windows npm — это npm.cmd, нужен shell=True)
    print("[3/3] Запуск Frontend (порт 5173)...")
    if sys.platform == "win32":
        frontend_cmd = "npm run dev -- --host 0.0.0.0 --port 5173"
        flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
        p_frontend = subprocess.Popen(
            frontend_cmd, cwd=frontend_dir, shell=True, creationflags=flags
        )
    else:
        p_frontend = _run(
            ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
            cwd=frontend_dir,
        )
    if not _wait_port("127.0.0.1", 5173, timeout_s=30):
        print("[ERROR] Frontend не поднялся на порту 5173.")
        print("Проверьте, что выполнено `npm install` в `frontend/` и порт 5173 свободен.")
        for p in (p_frontend, p_ml, p_backend):
            try:
                p.terminate()
            except Exception:
                pass
        sys.exit(1)
    print("[OK] Frontend слушает 5173")

    print()
    print("Все сервисы запущены.")
    print("Откройте приложение: https://aura-app.tail8dfcfc.ts.net/app.html")
    print("Локально: http://localhost:5173/app.html")
    print()
    print("Для ссылки ts.net должен быть включён Tailscale Funnel на порт 5173.")
    print("Остановить: нажмите Ctrl+C в этом окне.")
    print()

    try:
        # держим скрипт живым, чтобы дочерние процессы не закрывались вместе с ним
        while True:
            time.sleep(1)
            # если что-то упало — сообщаем
            if p_backend.poll() is not None:
                raise RuntimeError("Backend процесс завершился")
            if p_ml.poll() is not None:
                raise RuntimeError("ML процесс завершился")
            if p_frontend.poll() is not None:
                raise RuntimeError("Frontend процесс завершился")
    except KeyboardInterrupt:
        print("\nОстанавливаю сервисы...\n")
    finally:
        for p in (p_frontend, p_ml, p_backend):
            try:
                p.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    main()
