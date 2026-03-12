from data_provider import AbstractDataProvider
from datetime import datetime, timedelta
import os
# import google.generativeai as genai  # УДАЛЕНО: больше не используется, используем OpenRouter API напрямую
import requests
from typing import Optional, Dict, Any
import json
import pandas as pd
import time
import shutil
import uuid
# UploadFile и File больше не нужны здесь, они используются в routes.py

# Импорты API:
import uvicorn
from fastapi import FastAPI
from db_provider import DatabaseDataProvider



ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com"
ASSEMBLYAI_POLL_INTERVAL_SECONDS = 3
ASSEMBLYAI_MAX_WAIT_SECONDS = 5 * 60

# OpenRouter: модели для анализа мыслей и для отчётов
# Анализ мыслей (голос/текст) после нажатия «Сохранить»
OPENROUTER_MODEL_ANALYSIS = "liquid/lfm-2.5-1.2b-instruct:free"
# Генерация отчётов — та же модель (работает стабильно)
OPENROUTER_MODEL_REPORTS = "liquid/lfm-2.5-1.2b-instruct:free"

############################ инициализируем API и БД: ###############

app = FastAPI(title = "ML Pipline Service")

db_provider: Optional[DatabaseDataProvider] = None

@app.on_event("startup")
def startup_event():

    """Подключаемся к БД при запуске сервера"""
    global db_provider
    try: 
        print("Попытка подключения к БД...")
        db_provider = DatabaseDataProvider()
        print("[OK] API: подключились к базе данных успешно!")
        
        # Подключаем роуты
        from routes import setup_routes
        setup_routes(app, db_provider)
        print("[OK] Роуты подключены успешно!")
    except Exception as e: 
        print(f"[ERROR] ОШИБКА подключения к БД: {e}")
        import traceback
        traceback.print_exc()
        raise

@app.on_event("shutdown")
def shutdown_event():
    """Сбрасываем соединенеи с сервером"""
    if db_provider:
        db_provider.close()
        print("API: закрыли соединение с БД")     

# Модели данных перенесены в routes.py


#######################################################


def _load_config_value(key: str) -> Optional[str]:
    """
    Считывает значение из переменных окружения или config.env.
    """
    value = os.getenv(key)
    if value:
        return value

    config_path = os.path.join(os.path.dirname(__file__), 'config.env')
    if not os.path.exists(config_path):
        return None

    with open(config_path, 'r') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith(f"{key}="):
                return line.split('=', 1)[1].strip()
    return None


def get_assemblyai_api_key() -> Optional[str]:
    """
    Возвращает API ключ для AssemblyAI.
    """
    return _load_config_value('ASSEMBLYAI_API_KEY')


def upload_audio_to_assemblyai(audio_path: str, api_key: str) -> str:
    """
    Загружает локальный аудио файл в AssemblyAI и возвращает upload_url.
    """
    headers = {"authorization": api_key}
    upload_endpoint = f"{ASSEMBLYAI_BASE_URL}/v2/upload"

    with open(audio_path, "rb") as audio_file:
        response = requests.post(upload_endpoint, headers=headers, data=audio_file)

    if response.status_code != 200:
        raise RuntimeError(f"Не удалось загрузить аудио. Код ответа: {response.status_code}, текст: {response.text}")

    upload_url = response.json().get("upload_url")
    if not upload_url:
        raise RuntimeError("AssemblyAI не вернул upload_url")
    return upload_url


def start_transcription_job(audio_url: str, api_key: str, speech_model: str = "universal") -> str:
    """
    Создает задачу транскрибации и возвращает transcript_id.
    """
    headers = {
        "authorization": api_key,
        "content-type": "application/json"
    }
    # Используем новый формат: speech_models как массив + принудительно русский язык
    data = {
        "audio_url": audio_url,
        "speech_models": [speech_model],  # Новый формат: массив вместо строки
        "language_code": "ru",  # Принудительно включает русский язык
        "word_boost": ["ru"],  # Улучшает распознавание русских слов
        "format_text": True  # Форматирует текст
    }
    transcript_endpoint = f"{ASSEMBLYAI_BASE_URL}/v2/transcript"
    response = requests.post(transcript_endpoint, json=data, headers=headers)

    if response.status_code != 200:
        raise RuntimeError(f"Не удалось создать задачу транскрибации. Код ответа: {response.status_code}, текст: {response.text}")

    transcript_id = response.json().get("id")
    if not transcript_id:
        raise RuntimeError("AssemblyAI не вернул идентификатор транскрипта")
    return transcript_id


def poll_transcription_result(transcript_id: str, api_key: str, timeout_seconds: int = ASSEMBLYAI_MAX_WAIT_SECONDS) -> str:
    """
    Ожидает завершения транскрибации и возвращает текст.
    """
    headers = {"authorization": api_key}
    polling_endpoint = f"{ASSEMBLYAI_BASE_URL}/v2/transcript/{transcript_id}"
    waited = 0

    while waited < timeout_seconds:
        response = requests.get(polling_endpoint, headers=headers)
        if response.status_code != 200:
            raise RuntimeError(f"Ошибка при получении статуса транскрипции: {response.status_code}, текст: {response.text}")

        payload = response.json()
        status = payload.get("status")

        if status == "completed":
            transcript_text = payload.get("text", "")
            
            # Логируем информацию о ответе для отладки
            print(f"ИНФО: AssemblyAI статус completed. Текст из поля 'text': {len(transcript_text) if transcript_text else 0} символов")
            
            # Если текст пустой, пытаемся получить его из массива words
            if not transcript_text or not transcript_text.strip():
                words = payload.get("words", [])
                print(f"ИНФО: Поле 'text' пустое. Проверяем массив 'words': найдено {len(words) if words else 0} слов")
                
                if words and len(words) > 0:
                    # Собираем текст из массива words
                    word_texts = [word.get("text", "") for word in words if word.get("text")]
                    transcript_text = " ".join(word_texts)
                    print(f"ИНФО: Текст собран из массива words: {len(transcript_text)} символов, {len(word_texts)} слов")
                else:
                    # Проверяем другие возможные поля
                    alternative_text = payload.get("transcript", "") or payload.get("transcription", "")
                    if alternative_text and alternative_text.strip():
                        transcript_text = alternative_text
                        print(f"ИНФО: Текст найден в альтернативном поле: {len(transcript_text)} символов")
            
            # Если текст все еще пустой, это может означать что в аудио нет речи
            # Возвращаем пустую строку вместо ошибки - вызывающий код должен обработать это
            if not transcript_text or not transcript_text.strip():
                print("ПРЕДУПРЕЖДЕНИЕ: AssemblyAI вернул статус completed, но текст пустой.")
                print(f"ПРЕДУПРЕЖДЕНИЕ: Полный ответ от AssemblyAI: {json.dumps(payload, ensure_ascii=False, indent=2)[:500]}")
                return ""  # Возвращаем пустую строку вместо ошибки
            
            return transcript_text
        if status == "error":
            raise RuntimeError(f"AssemblyAI не смог обработать аудио: {payload.get('error', 'unknown error')}")

        time.sleep(ASSEMBLYAI_POLL_INTERVAL_SECONDS)
        waited += ASSEMBLYAI_POLL_INTERVAL_SECONDS

    raise TimeoutError("Превышено максимальное время ожидания транскрибации")


def transcribe_audio_file(audio_path: str, speech_model: str = "universal") -> str:
    """
    Полный цикл транскрибации локального аудио файла с помощью AssemblyAI.
    """
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Аудио файл {audio_path} не найден")

    api_key = get_assemblyai_api_key()
    if not api_key:
        raise RuntimeError("ASSEMBLYAI_API_KEY не найден в config.env или переменных окружения")

    print(f"ИНФО Загружаем аудио {audio_path} в AssemblyAI")
    audio_url = upload_audio_to_assemblyai(audio_path, api_key)

    print("ИНФО Создаем задачу транскрибации")
    transcript_id = start_transcription_job(audio_url, api_key, speech_model=speech_model)

    print(f"ИНФО Ожидаем результат транскрибации (transcript_id={transcript_id})")
    transcript_text = poll_transcription_result(transcript_id, api_key)

    print("OK Транскрибация завершена успешно")
    return transcript_text


def process_voice_recording(
    data_provider: AbstractDataProvider,
    user_id: int,
    audio_path: str,
    speech_model: str = "universal",
    thought_type: str = "voice"
) -> Optional[int]:
    """
    Транскрибирует локальный аудио файл и сохраняет результат в таблице thoughts.
    """
    try:
        transcript_text = transcribe_audio_file(audio_path, speech_model=speech_model)
    except Exception as exc:
        print(f"ОШИБКА Транскрибация не удалась: {exc}")
        return None

    created_at = datetime.now()

    if not hasattr(data_provider, "save_transcribed_voice"):
        raise AttributeError("У выбранного data_provider отсутствует метод save_transcribed_voice")

    thought_id = data_provider.save_transcribed_voice(
        user_id=user_id,
        created_at=created_at,
        voice_text=transcript_text,
        type_thought=thought_type
    )

    print(f"OK Транскрибированный текст сохранен в таблицу thoughts (thought_id={thought_id})")
    return thought_id


# Глобальная переменная для хранения API ключа
_gemini_api_key = None

def get_openrouter_api_key() -> Optional[str]:
    """Получает API ключ OpenRouter из config.env или переменных окружения"""
    global _gemini_api_key  # Используем то же имя для совместимости
    if _gemini_api_key:
        return _gemini_api_key
    
    api_key = None
    
    # Загружаем API ключ из файла конфигурации
    config_path = os.path.join(os.path.dirname(__file__), 'config.env')
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('OPENROUTER_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break
    
    # Если не нашли в файле, пробуем из переменных окружения
    if not api_key:
        api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        print("[ERROR] API ключ OpenRouter не найден в config.env или переменных окружения")
        return None
    
    _gemini_api_key = api_key
    return api_key

def get_gemini_api_key() -> Optional[str]:
    """Получает API ключ Gemini из config.env или переменных окружения"""
    api_key = None
    
    # Загружаем API ключ из файла конфигурации
    config_path = os.path.join(os.path.dirname(__file__), 'config.env')
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('GEMINI_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break
    
    # Если не нашли в файле, пробуем из переменных окружения
    if not api_key:
        api_key = os.getenv('GEMINI_API_KEY')
    
    return api_key

def conect_llm() -> Optional[str]:
    """
    Получает API ключ OpenRouter.
    Проверка подключения не выполняется - ключ возвращается сразу.
    Реальная проверка будет при первом запросе. 
    
    Returns:
        str: API ключ если найден, None если нет
    """
    try:
        api_key = get_openrouter_api_key()
        if not api_key:
            return None
        
        # Возвращаем ключ без проверки - проверка будет при реальном запросе
        # Это быстрее и избегает проблем с таймаутами
        return api_key
        
    except Exception as e:
        print(f"[ERROR] Ошибка получения API ключа OpenRouter: {e}")
        return None

def mind_score_to_percentage(mind_score: float) -> float:
    """
    Конвертирует mind_score из диапазона [-1.0, 1.0] в проценты [0%, 100%].
    
    Формула конвертации:
    - -1.0 -> 0%
    - 0.0 -> 50%
    - 1.0 -> 100%
    
    Args:
        mind_score: Значение от -1.0 (ужасно) до 1.0 (прекрасно)
    
    Returns:
        Процент от 0.0 до 100.0
    """
    return (mind_score + 1.0) * 50.0

####################################################################

# Запускается тогда, когда в БД thoughts появляется мысль
def analyze_thought(data_provider: AbstractDataProvider, user_id: int, thought_id: int, analyze_sentiment_only: bool = False) -> None:

    print(f"\n--- [Instant Analysis] Запуск мгновенного анализа для Thought ID: {thought_id} ---")
    if analyze_sentiment_only:
        print(f"[ID {thought_id}] Режим: анализ ТОЛЬКО сентимента (type_thought не изменяется)")


    # 1. Берем по thought_id текст мысли (content или voice_text)
    try:
        text_content = data_provider.get_thought_text(thought_id)
        print(f"[ID {thought_id}] Получен текст мысли: '{text_content[:100] if text_content else 'None'}...'")
    except Exception as e:
        print(f"[ERROR] [ID {thought_id}]: Не удалось получить текст мысли: {e}")
        import traceback
        traceback.print_exc()
        return

    if not text_content or str(text_content).strip() == "":
        print(f"[SKIP] [ID {thought_id}]: У мысли нет текста (пустой content и voice_text).")
        return

    # 2. Получаем существующие категории для пользователя
    try:
        existing_categories = data_provider.get_existing_type_thoughts(user_id)
        print(f"Существующие категории пользователя: {existing_categories}")
    except Exception as e:
        print(f"WARNING: Не удалось получить существующие категории: {e}")
        existing_categories = []

    # 3. Получаем API ключ OpenRouter
    print(f"[ID {thought_id}] Подключение к OpenRouter API...")
    api_key = conect_llm()
    if not api_key:
        print(f"[ERROR] [ID {thought_id}]: Не удалось подключиться к OpenRouter API.")
        print(f"[ERROR] [ID {thought_id}]: Проверьте OPENROUTER_API_KEY в config.env и интернет соединение")
        # ИСПРАВЛЕНИЕ: Устанавливаем дефолтную категорию если API недоступен
        print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное' так как API недоступен")
        try:
            data_provider.save_thought_analysis(
                thought_id=thought_id,
                user_id=user_id,
                thought_type="Разное",
                sentiment_label="neutral",
                sentiment_score=0.0
            )
            print(f"[OK] [ID {thought_id}]: Голосовая запись сохранена с категорией 'Разное'")
        except Exception as save_err:
            print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить дефолтную категорию: {save_err}")
        return
    print(f"[ID {thought_id}] [OK] API ключ получен, продолжаем анализ...")

    # 4. Формируем запрос
    if analyze_sentiment_only:
        # Режим: анализ ТОЛЬКО сентимента (type_thought не изменяется)
        prompt = f"""
Проанализируй текст мысли: "{text_content}"

Верни JSON с двумя полями:
1. "sentiment_label": "positive", "negative" или "neutral"
2. "sentiment_score": число float от -1.0 до 1.0

Ответ ТОЛЬКО JSON, без дополнительного текста.
Пример ответа: {{"sentiment_label": "positive", "sentiment_score": 0.7}}
"""
    else:
        # Полный анализ: категория + сентимент
        fixed_categories = ["Разное", "Работа", "Ментальное здоровье", "Физическое здоровье", "Планы", "Цели", "Задачи"]
        default_category = "Разное"
        
        prompt = f"""
Проанализируй текст мысли: "{text_content}"

Верни JSON с тремя полями:
1. "sentiment_label": "positive", "negative" или "neutral"
2. "sentiment_score": число float от -1.0 до 1.0
3. "type_thought": ОДНА из следующих категорий (на русском языке, ТОЧНО как указано):

Доступные категории (выбери СТРОГО по смыслу мысли, не по умолчанию):
- "Разное" - только если мысль не подходит ни под одну категорию ниже
- "Работа" - только для мыслей о работе, карьере, профессиональных задачах
- "Ментальное здоровье" - для мыслей о настроении, эмоциях, психологическом состоянии, стрессе
- "Физическое здоровье" - для мыслей о физическом состоянии, спорте, здоровье тела, самочувствии
- "Планы" - для мыслей о планах на будущее, намерениях, идеях что сделать
- "Цели" - для мыслей о целях, мечтах, амбициях, желаемых результатах
- "Задачи" - для мыслей о конкретных задачах, делах, которые нужно выполнить

ВАЖНО для type_thought:
- Выбери ОДНУ категорию, которая РЕАЛЬНО подходит по смыслу мысли (не выбирай "Работа" по умолчанию)
- Используй ТОЧНОЕ название категории как указано (с заглавной буквы, без изменений)
- Если мысль НЕ подходит ни под одну категорию - используй "{default_category}"

Ответ ТОЛЬКО JSON, без дополнительного текста.
Пример ответа: {{"sentiment_label": "positive", "sentiment_score": 0.7, "type_thought": "Планы"}}
"""

    try:
        # 5. Запрос к ИИ через OpenRouter API
        print(f"[ID {thought_id}] Отправка запроса к OpenRouter AI (Hermes 3 Llama 3.1 405B Free)...")
        
        # Настройка запроса к OpenRouter
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        data = {
            "model": OPENROUTER_MODEL_ANALYSIS,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 500,
            "reasoning": {"enabled": True}
        }
        
        # Логируем промпт для отладки (первые 300 символов)
        print(f"[ID {thought_id}] Промпт для анализа (первые 300 символов): {prompt[:300]}...")
        print(f"[ID {thought_id}] Текст мысли для анализа: '{text_content[:200]}...'")
        
        try:
            # ТОЛЬКО ОДНА ПОПЫТКА - без retry и fallback
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            # Проверяем статус ответа ПЕРЕД попыткой парсинга JSON
            if response.status_code != 200:
                error_text = response.text[:500] if response.text else "No error details"
                print(f"[ERROR] [ID {thought_id}]: OpenRouter API вернул ошибку {response.status_code}: {error_text}")
                
                if response.status_code == 401:
                    print(f"[ERROR] [ID {thought_id}]: Неверный API ключ OpenRouter (401). Проверьте OPENROUTER_API_KEY в config.env")
                    return
                elif response.status_code == 429:
                    # Пытаемся извлечь детали ошибки
                    try:
                        error_data = response.json()
                        error_detail = error_data.get('error', {}).get('message', '') if isinstance(error_data.get('error'), dict) else str(error_data.get('error', ''))
                    except:
                        error_detail = error_text[:200]
                    
                    print(f"[ERROR] [ID {thought_id}]: Превышен лимит запросов к OpenRouter API (429)")
                    print(f"[ERROR] [ID {thought_id}]: Детали: {error_detail[:200]}")
                    raise Exception(f"OpenRouter API quota exceeded (429). Details: {error_detail[:100]}")
                else:
                    # Для любых других ошибок - просто прекращаем анализ
                    print(f"[ERROR] [ID {thought_id}]: Ошибка API {response.status_code}. Анализ прерван.")
                    return
            
            # Только если статус 200 - обрабатываем ответ
            response_data = response.json()
            
            # Извлекаем текст ответа из формата OpenRouter
            if 'choices' not in response_data or len(response_data['choices']) == 0:
                print(f"[ERROR] [ID {thought_id}]: OpenRouter AI вернул пустой ответ")
                # ИСПРАВЛЕНИЕ: Устанавливаем дефолтную категорию при пустом ответе
                print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное'")
                try:
                    data_provider.save_thought_analysis(
                        thought_id=thought_id,
                        user_id=user_id,
                        thought_type="Разное",
                        sentiment_label="neutral",
                        sentiment_score=0.0
                    )
                    print(f"[OK] [ID {thought_id}]: Голосовая запись сохранена с категорией 'Разное'")
                except Exception as save_err:
                    print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить дефолтную категорию: {save_err}")
                return
            
            response_text = response_data['choices'][0]['message']['content']
            
            if not response_text:
                print(f"[ERROR] [ID {thought_id}]: OpenRouter AI вернул пустой текст")
                print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное'")
                try:
                    data_provider.save_thought_analysis(
                        thought_id=thought_id,
                        user_id=user_id,
                        thought_type="Разное",
                        sentiment_label="neutral",
                        sentiment_score=0.0
                    )
                    print(f"[OK] [ID {thought_id}]: Голосовая запись сохранена с категорией 'Разное'")
                except Exception as save_err:
                    print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить дефолтную категорию: {save_err}")
                return
            
            print(f"[ID {thought_id}] Получен ответ от OpenRouter AI")
            
            clean_json = response_text.strip().replace("```json", "").replace("```", "").strip()
            if clean_json.startswith("```"):
                lines = clean_json.split("\n")
                clean_json = "\n".join(lines[1:-1]) if len(lines) > 2 else clean_json
            
            # Если модель вернула рассуждения + JSON — извлекаем последний валидный JSON
            result = None
            try:
                result = json.loads(clean_json)
            except json.JSONDecodeError:
                pass
            if result is None and ("{" in clean_json and "}" in clean_json):
                start = clean_json.rfind("{")
                if start >= 0:
                    depth = 0
                    end = -1
                    for i in range(start, len(clean_json)):
                        if clean_json[i] == "{":
                            depth += 1
                        elif clean_json[i] == "}":
                            depth -= 1
                            if depth == 0:
                                end = i
                                break
                    if end > start:
                        try:
                            result = json.loads(clean_json[start:end + 1])
                            print(f"[ID {thought_id}] JSON извлечен из ответа с рассуждениями")
                        except json.JSONDecodeError:
                            pass
            if result is None:
                print(f"[ERROR] [ID {thought_id}]: Не удалось распарсить JSON ответ от OpenRouter")
                print(f"   Ответ был: {clean_json[:200]}...")
                print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное' для голосовой записи")
                try:
                    data_provider.save_thought_analysis(
                        thought_id=thought_id,
                        user_id=user_id,
                        thought_type="Разное",
                        sentiment_label="neutral",
                        sentiment_score=0.0
                    )
                    print(f"[OK] [ID {thought_id}]: Голосовая запись сохранена с категорией 'Разное'")
                except Exception as save_err:
                    print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить дефолтную категорию: {save_err}")
                return
                
        except requests.exceptions.RequestException as req_err:
            print(f"[ERROR] [ID {thought_id}]: Ошибка при запросе к OpenRouter API: {req_err}")
            import traceback
            traceback.print_exc()
            # ИСПРАВЛЕНИЕ: Устанавливаем дефолтную категорию при сетевой ошибке
            print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное' из-за сетевой ошибки")
            try:
                data_provider.save_thought_analysis(
                    thought_id=thought_id,
                    user_id=user_id,
                    thought_type="Разное",
                    sentiment_label="neutral",
                    sentiment_score=0.0
                )
                print(f"[OK] [ID {thought_id}]: Голосовая запись сохранена с категорией 'Разное'")
            except Exception as save_err:
                print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить дефолтную категорию: {save_err}")
            return
        except Exception as api_error:
            error_msg = str(api_error)
            # Если это наше исключение о квоте - пробрасываем дальше
            if "quota exceeded" in error_msg.lower() or "429" in error_msg:
                raise  # Пробрасываем исключение дальше для обработки в simple_ml.py
            print(f"[ERROR] [ID {thought_id}]: Неожиданная ошибка при запросе к OpenRouter API: {error_msg}")
            import traceback
            traceback.print_exc()
            # ИСПРАВЛЕНИЕ: Устанавливаем дефолтную категорию при общей ошибке
            print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное' из-за ошибки API")
            try:
                data_provider.save_thought_analysis(
                    thought_id=thought_id,
                    user_id=user_id,
                    thought_type="Разное",
                    sentiment_label="neutral",
                    sentiment_score=0.0
                )
                print(f"[OK] [ID {thought_id}]: Голосовая запись сохранена с категорией 'Разное'")
            except Exception as save_err:
                print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить дефолтную категорию: {save_err}")
            return
        
        # Получаем данные от ИИ
        s_label = result.get("sentiment_label")
        
        if analyze_sentiment_only:
            # Режим только сентимента: получаем текущий type_thought из БД и не изменяем его
            current_type_query = "SELECT type_thought FROM thoughts WHERE thought_id = %s AND user_id = %s"
            current_type_result = data_provider._execute_query(current_type_query, (thought_id, user_id))
            if current_type_result and current_type_result[0].get('type_thought'):
                t_type = current_type_result[0].get('type_thought')
                print(f"[ID {thought_id}] Сохраняем текущий type_thought='{t_type}' (не изменяем)")
            else:
                print(f"[WARN] [ID {thought_id}]: Не удалось получить текущий type_thought, пропускаем сохранение")
                return
        else:
            # Полный анализ: получаем type_thought от ИИ
            t_type = result.get("type_thought")
            
            if not t_type:
                print(f"[ERROR] [ID {thought_id}]: OpenRouter не вернул type_thought")
                # ИСПРАВЛЕНИЕ: Устанавливаем дефолтную категорию только если ИИ не вернул type_thought
                print(f"[FIX] [ID {thought_id}]: Устанавливаем дефолтную категорию 'Разное' так как ИИ не вернул type_thought")
                t_type = "Разное"
            
            # Проверяем что категория из фиксированного списка ДО сохранения
            fixed_categories = ["Разное", "Работа", "Ментальное здоровье", "Физическое здоровье", "Планы", "Цели", "Задачи"]
            if t_type not in fixed_categories:
                print(f"[WARN] [ID {thought_id}]: ИИ вернул категорию '{t_type}' не из фиксированного списка. Используем 'Разное'")
                t_type = "Разное"
        
        raw_score = result.get("sentiment_score")
        if raw_score is not None:
            try:
                s_score = float(raw_score)
            except (ValueError, TypeError):
                s_score = None # Если пришла строка, которую нельзя превратить в число
        else:
            s_score = None

        # 6. Мгновенное сохранение результата в ту же строку таблицы
        print(f"[ID {thought_id}] Сохранение результатов в БД...")
        if analyze_sentiment_only:
            print(f"[ID {thought_id}] Данные для сохранения: type_thought='{t_type}' (сохранен), sentiment_label='{s_label}', sentiment_score={s_score}")
        else:
            print(f"[ID {thought_id}] Данные для сохранения: type_thought='{t_type}', sentiment_label='{s_label}', sentiment_score={s_score}")
        
        try:
            result_id = data_provider.save_thought_analysis(
                thought_id=thought_id,
                user_id=user_id,
                thought_type=t_type,
                sentiment_label=s_label,
                sentiment_score=s_score
            )
            print(f"[ID {thought_id}] [OK] Данные успешно сохранены в БД (result_id={result_id})")
            
            # Немедленная проверка что данные сохранились
            verify_query = "SELECT type_thought, sentiment_label, sentiment_score FROM thoughts WHERE thought_id = %s AND user_id = %s"
            verify_result = data_provider._execute_query(verify_query, (thought_id, user_id))
            if verify_result and verify_result[0].get('type_thought'):
                print(f"[ID {thought_id}] [OK] ПОДТВЕРЖДЕНО: type_thought='{verify_result[0].get('type_thought')}' сохранен в БД!")
            else:
                print(f"[WARN] [ID {thought_id}]: Проверка БД не подтвердила сохранение type_thought")
                
        except Exception as save_err:
            print(f"[ERROR] [ID {thought_id}]: Не удалось сохранить анализ в БД: {save_err}")
            import traceback
            traceback.print_exc()
            return
        
        # 7. После анализа обновляем mind_score и сохраняем в БД
        calculate_mind_score(data_provider, user_id, thought_id)
        
        print(f"[SUCCESS] [ID {thought_id}] Type: {t_type} | Sentiment: {s_label} ({s_score})")
        
        # 9. Проверяем что данные действительно сохранились
        try:
            verify_query = "SELECT type_thought, sentiment_label, sentiment_score FROM thoughts WHERE thought_id = %s"
            verify_result = data_provider._execute_query(verify_query, (thought_id,))
            if verify_result:
                print(f"[ID {thought_id}] [OK] Проверка БД: type_thought='{verify_result[0].get('type_thought')}', sentiment='{verify_result[0].get('sentiment_label')}'")
            else:
                print(f"⚠ WARNING [ID {thought_id}]: Не удалось проверить сохраненные данные")
        except Exception as verify_err:
            print(f"⚠ WARNING [ID {thought_id}]: Ошибка при проверке данных: {verify_err}")

    except Exception as e:
        print(f"[ERROR] ОШИБКА при анализе мысли ID {thought_id}: {e}")
        import traceback
        traceback.print_exc()






def calculate_mind_score(data_provider: AbstractDataProvider, user_id: int, thought_id: int) -> None:
    """
    Вычисляет накопительный средний рейтинг настроения (mind_score)
    от первой мысли до текущей и сохраняет его в БД.
    """
    print(f"\n--- [Mind Score] Расчет накопительного рейтинга для Thought ID: {thought_id} ---")
    
    try:
        # 1. Сначала убеждаемся, что колонка существует (можно вызывать один раз при старте приложения, 
        # но для надежности оставим здесь или перенесем в инициализацию провайдера)
        data_provider.ensure_mind_score_column()
        
        # 2. Производим расчет и сохранение
        new_score = data_provider.calculate_and_save_mind_score(user_id, thought_id)
        
        print(f"SUCCESS: Mind Score обновлен: {new_score:.4f}")
        
    except Exception as e:
        print(f"ОШИБКА при расчете Mind Score: {e}")


# Запуск каждую неделю и анализ за последнюю неделю
def run_analysis(data_provider: AbstractDataProvider, user_id: int, date_from: Optional[str] = None, date_to: Optional[str] = None) -> None:
    """
    Генерирует отчет на основе мыслей (content + voice_text)
    с учетом контекста (words_for_prompt).
    Результат сохраняется в reports_history.
    
    Args:
        data_provider: Провайдер данных
        user_id: ID пользователя
        date_from: Дата начала (опционально, формат YYYY-MM-DD)
        date_to: Дата окончания (опционально, формат YYYY-MM-DD)
    """
    print(f"\n{'='*60}")
    print(f"НАЧАЛО АНАЛИЗА для user_id={user_id}")
    print(f"  date_from={date_from} (type: {type(date_from)})")
    print(f"  date_to={date_to} (type: {type(date_to)})")
    print(f"{'='*60}\n")

    # 1. Определяем временной период
    if date_from and date_to and date_from.strip() and date_to.strip():
        try:
            print(f"ИНФО: Парсинг дат: date_from={date_from}, date_to={date_to}")
            start_date = datetime.strptime(date_from, "%Y-%m-%d")
            end_date = datetime.strptime(date_to, "%Y-%m-%d")
            end_date = end_date.replace(hour=23, minute=59, second=59)  # Включаем весь день окончания
            print(f"ИНФО: Используется указанный диапазон: {start_date} - {end_date}")
        except ValueError as e:
            print(f"ОШИБКА: Неверный формат даты: {e}. Используется диапазон по умолчанию (последние 7 дней)")
            import traceback
            traceback.print_exc()
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
    else:
        # По умолчанию - последние 7 дней
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        print(f"ИНФО: Используется диапазон по умолчанию: последние 7 дней ({start_date} - {end_date})")

    # 2. Настройки промпта больше не используются - отчет генерируется по фиксированной структуре

    # 3. Получаем данные мыслей
    try:
        print(f"ИНФО: Запрос мыслей для user_id={user_id}, start_date={start_date}, end_date={end_date}")
        # get_thoughts возвращает DataFrame с колонками: content, voice_text, created_at
        thoughts_df = data_provider.get_thoughts(user_id, start_date, end_date)
        print(f"ИНФО: Получено {len(thoughts_df)} записей для анализа")
    except Exception as e:
        print(f"ОШИБКА при получении мыслей: {e}")
        import traceback
        traceback.print_exc()
        return

    if thoughts_df.empty:
        print(f"ИНФО: В диапазоне {start_date} - {end_date} нет записей для анализа.")
        return

    # 4. Формируем данные мыслей в формате JSON для промпта
    thoughts_list = []
    for _, row in thoughts_df.iterrows():
        # Форматируем дату в формате YYYY-MM-DD HH:MM
        timestamp_str = row['created_at'].strftime("%Y-%m-%d %H:%M")
        thought_id = row.get('thought_id')
        
        # Запись идет только либо в voice_text, если юзер сделал запись через голос,
        # либо через content - если юзер сделал запись просто напечатав 
        
        # 1. Извлекаем сырые данные из строки
        raw_content = row.get('content')
        raw_voice = row.get('voice_text')

        # 2. Проверяем наличие данных (не NaN и не пустая строка)
        has_content = not pd.isna(raw_content) and str(raw_content).strip() != ""
        has_voice = not pd.isna(raw_voice) and str(raw_voice).strip() != ""

        # 3. Логика выбора источника текста
        if has_content:
            text_content = raw_content
        elif has_voice:
            text_content = raw_voice
        else:
            raise ValueError(f"Пустая запись ID {thought_id}")

        # Добавляем запись в формате JSON объекта
        thoughts_list.append({
            "timestamp": timestamp_str,
            "text": str(text_content).strip()
        })
    
    # Преобразуем список в JSON строку для промпта
    history_text = json.dumps(thoughts_list, ensure_ascii=False, indent=2)


    # 5. Получаем API ключ OpenRouter
    print(f"ИНФО: Подключение к OpenRouter API...")
    api_key = conect_llm()
    print(f"ИНФО: api_key получен, тип: {type(api_key)}, значение: {api_key[:10] + '...' if api_key and len(api_key) > 10 else api_key}")
    if not api_key:
        print("ОШИБКА: Нет соединения с OpenRouter API.")
        return
    if not isinstance(api_key, str):
        print(f"ОШИБКА: api_key должен быть строкой, но получен тип: {type(api_key)}")
        return

    # 6. Промпт для генерации отчета по структуре осознанности с учетом времени
    prompt = f"""РОЛЬ АССИСТЕНТА

Ты — ИИ-ассистент для практики осознанности.
Твоя задача — структурировать внутренний опыт человека во времени, помогая ему увидеть:

что происходит внутри,

как это повторяется,

когда это возникает.

Ты не объясняешь причины, не даёшь советов, не оцениваешь и не делаешь выводов о личности.

БАЗОВЫЕ ПРИНЦИПЫ (ОБЯЗАТЕЛЬНО)

Язык наблюдения, от третьего лица:
«в записях встречается», «чаще появляется», «наблюдается тенденция»

Чётко различай уровни опыта

Используй вероятностные формулировки

Не используй: проблема, причина, должен, нужно, исправить

Не используй «всегда / никогда»

Не интерпретируй глубже, чем позволяет текст

Максимум 400 слов

ЗАДАЧА

Проанализируй мысли пользователя, каждая запись содержит текст и временную метку.
Используй время только для наблюдений о повторяемости и контекстах, не для выводов о причинах.

СТРУКТУРА ОТЧЁТА (НЕ МЕНЯТЬ)
1️⃣ Карта внутреннего опыта

Раздели записи на 4 уровня.
Внутри каждого блока сгруппируй элементы, если заметна временная повторяемость
(например: утро / день / вечер, рабочие дни / выходные — только если это явно следует из данных).

События / контексты

…

…

Интерпретации / мысли

…

…

Эмоции / состояния

…

…

Реакции / поведение

…

…

Если временная группировка невозможна — явно укажи это.

2️⃣ Повторяющиеся связки (с временным контекстом)

Выдели 2–4 заметные связки, добавляя временное наблюдение только при наличии данных.

Формат:

Когда появляется мысль «X» → чаще возникает эмоция «Y» → реакция «Z»
(часто фиксируется в [временной интервал])

Пример интервалов:

утренние часы

поздний вечер

конец рабочего дня

выходные

Не используй точные часы, если в этом нет аналитического смысла.

3️⃣ Временные наблюдения (отдельный слой)

Сформулируй 1–3 нейтральных наблюдения о времени.

Допустимые формулировки:

«Определённые мысли чаще появляются во второй половине дня»

«Эмоции X и Y чаще фиксируются в вечерних записях»

Недопустимые:

объяснение причин

предположения о биоритмах, психике, усталости

4️⃣ Нейтральное обобщение

Одно предложение, без причинно-следственных связей.

Пример формы:



ВХОДНЫЕ ДАННЫЕ

Мысли пользователя в формате:

timestamp: дата и время записи

text: текст мысли

{history_text}

КРИТЕРИЙ КАЧЕСТВА ОТЧЁТА

Отчёт считается успешным, если:

временной слой усиливает осознавание, а не перегружает

человек видит повторяемость во времени

отчёт не подталкивает к интерпретациям «почему»

ВАЖНО (DESIGN NOTE)

Если временные данные противоречивы или разрозненны —
явно сообщи, что устойчивых временных паттернов не выявлено.

ФОРМАТ ВЫВОДА (Markdown — обязательно для красивого отображения)
- Каждый из 5 блоков оформи заголовком второго уровня: ## 1️⃣ Карта внутреннего опыта (и аналогично для 2️⃣–5️⃣).
- Подзаголовки внутри блока (События / контексты, Интерпретации / мысли, Эмоции / состояния, Реакции / поведение) — как ### Подзаголовок.
- Списки оформляй через дефис с новой строки (- элемент). Каждый элемент с новой строки.
- Связки и цитаты — с новой строки; для акцентов используй **жирный**.
- Между основными блоками (между ##) оставляй одну пустую строку.
- Не используй лишние уровни заголовков; структура: ## блок, ### подраздел, затем списки через -.
"""


    try:
        # Генерация через OpenRouter API
        print(f"ИНФО: Отправка запроса к ИИ для генерации отчета по структуре осознанности...")
        print(f"ИНФО: api_key тип: {type(api_key)}, длина: {len(api_key) if api_key else 0}")
        print(f"ИНФО: Проверка наличия requests: {hasattr(requests, 'post')}")
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        data = {
            "model": OPENROUTER_MODEL_REPORTS,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 1800,  # Максимум 400 слов в отчете согласно промпту
            "reasoning": {"enabled": True}
        }
        
        print(f"ИНФО: Выполнение requests.post...")
        response = requests.post(url, headers=headers, json=data, timeout=60)
        print(f"ИНФО: Получен ответ от OpenRouter, статус: {response.status_code}")
        
        if response.status_code != 200:
            error_text = response.text[:500] if response.text else "No error details"
            print(f"ОШИБКА: OpenRouter API вернул ошибку {response.status_code}: {error_text}")
            return
        
        response_data = response.json()
        
        if 'choices' not in response_data or len(response_data['choices']) == 0:
            print("ОШИБКА: OpenRouter AI вернул пустой ответ")
            return
        
        report_result = response_data['choices'][0]['message']['content']
        
        if not report_result:
            print("ОШИБКА: OpenRouter AI вернул пустой текст")
            return

        # 7. Сохранение отчета
        # log_datetime — это текущее время генерации
        print(f"ИНФО: Начинаем сохранение отчета в БД...")
        print(f"ИНФО: user_id={user_id}, report_content длина={len(report_result) if report_result else 0}")
        print(f"ИНФО: date_from={start_date}, date_to={end_date}")
        print(f"ИНФО: data_provider тип: {type(data_provider)}")
        print(f"ИНФО: Проверка метода save_report: {hasattr(data_provider, 'save_report')}")
        
        try:
            new_report_id = data_provider.save_report(
                user_id=user_id,
                report_content=report_result,
                log_datetime=datetime.now(),
                date_from=start_date,
                date_to=end_date
            )
            print(f"SUCCESS: Отчет успешно сгенерирован и сохранен. ID отчета: {new_report_id}")
        except Exception as save_error:
            print(f"ОШИБКА при вызове save_report: {save_error}")
            print(f"Тип ошибки: {type(save_error)}")
            import traceback
            traceback.print_exc()
            raise


    except Exception as e:
        print(f"ОШИБКА при генерации/сохранении отчета: {e}")
        import traceback
        traceback.print_exc()
        print(f"Тип ошибки: {type(e)}")
        print(f"Аргументы ошибки: {e.args if hasattr(e, 'args') else 'N/A'}")



################################  Эндпоинты API: ############################################
# Эндпоинты перенесены в routes.py


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)