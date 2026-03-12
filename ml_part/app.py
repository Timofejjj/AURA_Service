#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML Service - Main Application Entry Point
Запускает FastAPI сервер для анализа мыслей и генерации отчетов
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db_provider import DatabaseDataProvider
from typing import Optional

# Создаем FastAPI приложение
app = FastAPI(
    title="Aura ML Service",
    description="Machine Learning service for thought analysis and report generation",
    version="1.0.0"
)

# CORS настройки для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://100.64.148.91:5173",  # Tailscale IP
        "http://100.64.148.91:8080",  # Backend через Tailscale
        "https://aura-app.tail8dfcfc.ts.net",  # Tailscale Funnel HTTPS
        "http://aura-app.tail8dfcfc.ts.net",   # Tailscale Funnel HTTP
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальная переменная для DB provider
db_provider: Optional[DatabaseDataProvider] = None

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске сервера"""
    global db_provider
    try:
        print("="*50)
        print("Starting ML Service...")
        print("="*50)
        
        # Подключаемся к БД
        print("\n[1/2] Connecting to database...")
        db_provider = DatabaseDataProvider()
        print("[OK] Database connected successfully!")
        
        # Подключаем роуты
        print("\n[2/2] Setting up routes...")
        from routes import setup_routes
        setup_routes(app, db_provider)
        print("[OK] Routes configured successfully!")
        
        print("\n" + "="*50)
        print("ML Service is ready!")
        print("="*50)
        print("\nAvailable endpoints:")
        print("  GET  /           - Health check")
        print("  POST /api/analyze-thought  - Analyze thought")
        print("  POST /api/generate-report  - Generate report")
        print("  POST /api/upload-voice     - Upload voice")
        print("  GET  /api/mind-score       - Get mind score")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR] STARTUP ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\nML Service failed to start!")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при остановке сервера"""
    if db_provider:
        db_provider.close()
        print("\n✓ Database connection closed")

@app.get("/health")
def health_check():
    """Простая проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "service": "ML Service",
        "database": "connected" if db_provider else "disconnected"
    }

if __name__ == "__main__":
    print("\n" + "="*50)
    print("Aura ML Service")
    print("="*50)
    print("Starting server on http://0.0.0.0:8000")
    print("Press Ctrl+C to stop")
    print("="*50 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

