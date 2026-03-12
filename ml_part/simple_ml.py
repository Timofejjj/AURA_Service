#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML Service with Full Analysis Logic
ML сервис с полной логикой анализа мыслей
"""

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db_provider import DatabaseDataProvider
from typing import Optional
import sys
import os
import shutil
import uuid
from datetime import datetime

print("="*60)
print("Starting ML Service with Full Analysis...")
print("="*60)

# Создаем FastAPI приложение
app = FastAPI(title="Aura ML Service - Full Version")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://aura-app.tail8dfcfc.ts.net",
        "https://aura-app-api.tail8dfcfc.ts.net",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global DB provider
db_provider: Optional[DatabaseDataProvider] = None

class ThoughtAnalysisRequest(BaseModel):
    user_id: int
    thought_id: int
    analyze_sentiment_only: Optional[bool] = False  # Если True, анализирует только сентимент, не меняет type_thought

class ReportRequest(BaseModel):
    user_id: int
    date_from: Optional[str] = None
    date_to: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    global db_provider
    try:
        print("\n[Step 1/2] Connecting to database...")
        db_provider = DatabaseDataProvider()
        print("[OK] Database connected!")
        
        print("\n[Step 2/2] Service ready!")
        print("\n" + "="*60)
        print("ML Service is ONLINE at http://0.0.0.0:8000")
        print("="*60)
        print("\nAvailable endpoints:")
        print("  POST /api/analyze-thought  - Analyze thought with ML")
        print("  POST /api/generate-report  - Generate weekly report")
        print("  POST /api/upload-voice     - Upload and transcribe voice")
        print("  GET  /api/mind-score       - Get user mind score")
        print("  GET  /health               - Health check")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR] during startup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка"""
    if db_provider:
        db_provider.close()
        print("Database closed")

@app.get("/")
def root():
    return {
        "status": "running",
        "service": "ML Pipeline (Full Version)",
        "message": "ML Service with full analysis is operational",
        "features": [
            "Thought sentiment analysis",
            "Dynamic category assignment (type_thought)",
            "Mind score calculation",
            "Weekly report generation"
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected" if db_provider else "disconnected"
    }

@app.post("/api/analyze-thought")
async def analyze_thought_endpoint(request: ThoughtAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Запускает анализ мысли в фоновом режиме.
    ML определяет:
    - sentiment_label и sentiment_score
    - type_thought (категорию/папку) - использует существующие или создает новую
    """
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    analyze_sentiment_only = request.analyze_sentiment_only or False
    print(f"\n>>> Received analysis request: user_id={request.user_id}, thought_id={request.thought_id}, analyze_sentiment_only={analyze_sentiment_only}")
    
    # Проверяем, есть ли уже type_thought у этой мысли (только для полного анализа)
    if not analyze_sentiment_only:
        try:
            check_query = "SELECT type_thought FROM thoughts WHERE thought_id = %s AND user_id = %s"
            result = db_provider._execute_query(check_query, (request.thought_id, request.user_id))
            if result and result[0].get('type_thought'):
                print(f">>> Thought {request.thought_id} already has category: {result[0].get('type_thought')}")
                return {
                    "status": "already_analyzed",
                    "message": "Thought already analyzed",
                    "thought_id": request.thought_id,
                    "type_thought": result[0].get('type_thought')
                }
        except Exception as e:
            print(f"Warning: Could not check existing analysis: {e}")
    else:
        # Для режима только сентимента проверяем что type_thought уже установлен
        try:
            check_query = "SELECT type_thought FROM thoughts WHERE thought_id = %s AND user_id = %s"
            result = db_provider._execute_query(check_query, (request.thought_id, request.user_id))
            if not result or not result[0].get('type_thought'):
                print(f">>> WARNING: Thought {request.thought_id} does not have type_thought for sentiment-only analysis")
                return {
                    "status": "error",
                    "message": "Thought must have type_thought set before sentiment-only analysis",
                    "thought_id": request.thought_id,
                    "error": "missing_type_thought"
                }
        except Exception as e:
            print(f"Warning: Could not check type_thought: {e}")
    
    # Проверяем доступность OpenRouter API ПЕРЕД запуском анализа
    from main_logic import conect_llm
    api_key = conect_llm()
    if not api_key:
        print(f">>> ERROR: OpenRouter API not available - cannot analyze thought {request.thought_id}")
        return {
            "status": "error",
            "message": "OpenRouter API is not available. Please check API key and internet connection.",
            "thought_id": request.thought_id,
            "error": "openrouter_api_unavailable"
        }
    
    # Импортируем функцию анализа из main_logic
    from main_logic import analyze_thought
    
    # Запускаем анализ в фоне (как генерацию отчёта) — API возвращает сразу, пользователь не ждёт
    analyze_sentiment_only = request.analyze_sentiment_only or False
    if analyze_sentiment_only:
        print(f">>> Starting BACKGROUND sentiment-only analysis for thought {request.thought_id}...")
    else:
        print(f">>> Starting BACKGROUND full analysis for thought {request.thought_id}...")
    background_tasks.add_task(analyze_thought, db_provider, request.user_id, request.thought_id, analyze_sentiment_only)
    return {
        "status": "accepted",
        "message": "Analysis started",
        "thought_id": request.thought_id
    }


@app.post("/api/generate-report")
async def generate_report_endpoint(request: ReportRequest, background_tasks: BackgroundTasks):
    """Генерация отчета за указанный диапазон дат"""
    if not db_provider:
        print("ОШИБКА: Database not initialized")
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    print(f"\n{'='*60}")
    print(f">>> Received report generation request:")
    print(f"    user_id={request.user_id}")
    print(f"    date_from={request.date_from} (type: {type(request.date_from)})")
    print(f"    date_to={request.date_to} (type: {type(request.date_to)})")
    print(f"{'='*60}\n")
    
    from main_logic import run_analysis
    
    # Передаем диапазон дат в run_analysis
    try:
        background_tasks.add_task(run_analysis, db_provider, request.user_id, request.date_from, request.date_to)
        print(f"ИНФО: Задача добавлена в background_tasks")
    except Exception as e:
        print(f"ОШИБКА при добавлении задачи: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start report generation: {str(e)}")
    
    return {
        "status": "accepted",
        "message": "Report generation started"
    }

@app.post("/api/upload-voice")
async def upload_voice_endpoint(
    background_tasks: BackgroundTasks,
    user_id: int = Form(...),
    file: UploadFile = File(...)
):
    """
    Обработка голосового файла:
    1. Сохраняет файл временно
    2. Транскрибирует через AssemblyAI
    3. Сохраняет транскрипцию в БД
    4. Запускает анализ мысли в фоне
    """
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    from main_logic import transcribe_audio_file, analyze_thought
    
    os.makedirs("temp_audio", exist_ok=True)
    
    # Генерируем имя файла
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else "m4a"
    temp_filename = f"temp_audio/{user_id}_{uuid.uuid4()}.{file_ext}"
    
    try:
        # Сохраняем файл
        print(f"[UPLOAD] Начинаем сохранение файла: {temp_filename}")
        print(f"[UPLOAD] Имя файла: {file.filename}, размер: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Проверяем, что файл действительно сохранился
        if not os.path.exists(temp_filename):
            raise FileNotFoundError(f"Файл не был сохранен: {temp_filename}")
        
        file_size = os.path.getsize(temp_filename)
        print(f"[UPLOAD] Файл сохранен: {temp_filename}, размер: {file_size} байт")
        
        if file_size == 0:
            raise ValueError("Загруженный файл пустой (0 байт)")
        
        # Транскрибируем
        print(f"[UPLOAD] Начинаем транскрипцию...")
        try:
            transcript_text = transcribe_audio_file(temp_filename, speech_model="universal")
            print(f"[UPLOAD] Транскрипция завершена: {len(transcript_text) if transcript_text else 0} символов")
            
            # Проверяем, что транскрипция не пустая
            if not transcript_text or not transcript_text.strip():
                raise ValueError("Транскрипция вернула пустой текст. Возможно, в аудио нет речи, файл слишком короткий, или качество звука недостаточное для распознавания.")
            
        except Exception as transcribe_error:
            print(f"[UPLOAD] Ошибка транскрипции: {transcribe_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка транскрипции аудио: {str(transcribe_error)}"
            )
        
        # Сохраняем транскрипцию в БД
        print(f"[UPLOAD] Сохраняем в БД...")
        try:
            thought_id = db_provider.save_transcribed_voice(
                user_id=user_id,
                created_at=datetime.now(),
                voice_text=transcript_text,
                type_thought=None  # ML определит категорию во время анализа при нажатии "готово"
            )
            print(f"[UPLOAD] Сохранено в БД: thought_id={thought_id}")
        except Exception as db_error:
            print(f"[UPLOAD] Ошибка сохранения в БД: {db_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка сохранения в базу данных: {str(db_error)}"
            )
        
        print(f"[UPLOAD] Успешно обработано. Анализ будет запущен при нажатии кнопки 'готово'")
        
        return {
            "status": "success",
            "message": "Voice processed successfully",
            "thought_id": thought_id,
            "text": transcript_text  # Используем "text" для совместимости с frontend
        }
        
    except HTTPException:
        # Перебрасываем HTTPException как есть
        raise
    except Exception as e:
        print(f"[UPLOAD] Неожиданная ошибка обработки: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing voice: {str(e)}")
    
    finally:
        # Удаляем временный файл
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
                print(f"[UPLOAD] Временный файл удален: {temp_filename}")
            except Exception as e:
                print(f"[UPLOAD] Не удалось удалить временный файл: {e}")

@app.get("/api/mind-score")
def get_mind_score(user_id: int):
    """
    Возвращает mind score пользователя.
    Mind score - это средний sentiment_score всех мыслей, конвертированный в проценты.
    """
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    try:
        score = db_provider.get_latest_mind_score(user_id)
        if score is None:
            return {
                "status": "missing",
                "mind_score": None,
                "energy_level": None,
                "message": "No thoughts analyzed yet"
            }
        
        # Convert score from [-1, 1] to [0, 100]
        from main_logic import mind_score_to_percentage
        energy_level = mind_score_to_percentage(score)
        
        return {
            "status": "success",
            "mind_score": score,
            "energy_level": energy_level
        }
    except Exception as e:
        print(f"Error getting mind score: {e}")
        return {
            "status": "error",
            "mind_score": None,
            "energy_level": None,
            "message": str(e)
        }

@app.post("/api/analyze-all-unanalyzed")
async def analyze_all_unanalyzed_endpoint(request: ReportRequest, background_tasks: BackgroundTasks):
    """
    Анализирует все мысли пользователя, у которых нет type_thought.
    Полезно для повторного анализа или анализа старых мыслей.
    """
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    print(f"\n>>> Received request to analyze all unanalyzed thoughts for user_id={request.user_id}")
    
    # Проверяем доступность Gemini API ПЕРЕД запуском анализа
    from main_logic import conect_llm
    api_key = conect_llm()
    if not api_key:
        print(f">>> ERROR: Gemini API not available - cannot analyze thoughts")
        return {
            "status": "error",
            "message": "Gemini API is not available. Please check API key and internet connection.",
            "count": 0,
            "error": "gemini_api_unavailable"
        }
    
    try:
        # Получаем все мысли без type_thought
        query = "SELECT thought_id FROM thoughts WHERE user_id = %s AND (type_thought IS NULL OR type_thought = '')"
        result = db_provider._execute_query(query, (request.user_id,))
        
        if not result:
            return {
                "status": "no_thoughts",
                "message": "No unanalyzed thoughts found",
                "count": 0
            }
        
        thought_ids = [row['thought_id'] for row in result]
        print(f">>> Found {len(thought_ids)} unanalyzed thoughts: {thought_ids}")
        
        # Импортируем функцию анализа
        from main_logic import analyze_thought
        
        # Запускаем анализ для каждой мысли в фоне
        for thought_id in thought_ids:
            background_tasks.add_task(analyze_thought, db_provider, request.user_id, thought_id)
        
        return {
            "status": "accepted",
            "message": f"Analysis started for {len(thought_ids)} thoughts",
            "count": len(thought_ids),
            "thought_ids": thought_ids
        }
    except Exception as e:
        print(f"Error analyzing unanalyzed thoughts: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

