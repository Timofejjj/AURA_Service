from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime
import os
import shutil
import uuid
from typing import Optional
from db_provider import DatabaseDataProvider

# Import only what we need to avoid circular imports
# analyze_thought, run_analysis, transcribe_audio_file will be imported lazily

# Модели данных:
class ThoughtAnalysisRequest(BaseModel):
    user_id: int
    thought_id: int
    analyze_sentiment_only: Optional[bool] = False  # Если True, анализирует только сентимент, не меняет type_thought

class ReportRequest(BaseModel):
    user_id: int
    date_from: Optional[str] = None
    date_to: Optional[str] = None

# Создаем роутер
router = APIRouter()

# Глобальная переменная для db_provider (будет установлена при инициализации)
db_provider: Optional[DatabaseDataProvider] = None

def setup_routes(app, database_provider: DatabaseDataProvider):
    """
    Настраивает роуты для приложения.
    
    Args:
        app: FastAPI приложение
        database_provider: Провайдер базы данных
    """
    global db_provider
    db_provider = database_provider
    app.include_router(router)

@router.get("/")
def health_check():
    return {"status": "running", "service": "ML Pipeline"}

@router.post("/api/analyze-thought")
async def analyze_thought_endpoint(request: ThoughtAnalysisRequest, background_tasks: BackgroundTasks):
    """прием события о записи новой мысли и запуск анализа в фоне"""
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")

    from main_logic import analyze_thought
    background_tasks.add_task(analyze_thought, db_provider, request.user_id, request.thought_id, request.analyze_sentiment_only)
    return {"status": "accepted", "message": "Analysis started in background"}

@router.post("/api/generate-report")
async def generate_report_endpoint(request: ReportRequest, background_tasks: BackgroundTasks):
    """прием события о запуске генерации отчета и запуск генерации в фоне"""
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")

    from main_logic import run_analysis
    background_tasks.add_task(run_analysis, db_provider, request.user_id, request.date_from, request.date_to)
    return {"status": "accepted", "message": "Report generation started in background"}

@router.post("/api/upload-voice")
async def upload_voice_endpoint(
    background_tasks: BackgroundTasks,
    user_id: int = Form(...),
    file: UploadFile = File(...)
):
    """Обработка голосовго файла""" 
    if not db_provider:
        raise HTTPException(status_code=503, detail="DB not init.")

    from main_logic import transcribe_audio_file
    
    os.makedirs("temp_audio", exist_ok=True)

    # Генерируем имя файла: 
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else "m4a"
    temp_filename = f"temp_audio/{user_id}_{uuid.uuid4()}.{file_ext}"

    try: 
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    
        print(f"Файл сохранился {temp_filename}")
    
        transcript_text = transcribe_audio_file(temp_filename, speech_model="universal")
        
        # Проверяем, что транскрипция не пустая
        if not transcript_text or not transcript_text.strip():
            raise ValueError("Транскрипция вернула пустой текст. Возможно, в аудио нет речи, файл слишком короткий, или качество звука недостаточное для распознавания.")

        # Save transcribed voice without type_thought - ML will determine it after user clicks "save"
        thought_id = db_provider.save_transcribed_voice(
            user_id=user_id,
            created_at=datetime.now(),
            voice_text=transcript_text,
            type_thought=None  # ML will determine the category during analysis after user clicks "save"
        )

        # НЕ запускаем анализ здесь - анализ будет запущен после нажатия кнопки "сохранить" на фронтенде
        # background_tasks.add_task(analyze_thought, db_provider, user_id, thought_id)

        # На фронт:
        return {
            "status": "success",
            "message": "Processed successfully",
            "thought_id": thought_id,
            "text": transcript_text
        }

    except Exception as e:
        print(f"Ошибка обработки {e}")
        raise HTTPException(status_code=500, detail=f"Error processing voice {str(e)}")

    finally: 
        if os.path.exists(temp_filename):
            try: 
                os.remove(temp_filename)
            except Exception:
                pass


@router.get("/api/mind-score")
def get_mind_score(user_id: int):
    """Возвращает последний mind_score для пользователя с конвертацией в процент"""
    if not db_provider:
        raise HTTPException(status_code=503, detail="Database not initialized")

    from main_logic import mind_score_to_percentage
    
    score = db_provider.get_latest_mind_score(user_id)
    if score is None:
        return {"status": "missing", "mind_score": None, "energy_level": None}

    return {
        "status": "success",
        "mind_score": score,
        "energy_level": mind_score_to_percentage(score)
    }

