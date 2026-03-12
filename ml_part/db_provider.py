# Реализует взаимодействие с реальной PostgreSQL базой данных

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from datetime import datetime
from typing import Dict, Any, Optional, Literal
import pandas as pd

from data_provider import AbstractDataProvider


class DatabaseDataProvider(AbstractDataProvider):
    """
    Реализация Data Provider, которая использует PostgreSQL базу данных.
    Подключается напрямую к базе данных и выполняет SQL запросы.
    """
    
    def __init__(self, connection_string: str = None, minconn: int = 1, maxconn: int = 10):
        """
        Инициализирует провайдер для работы с PostgreSQL.
        
        Args:
            connection_string: Строка подключения к БД в формате 
                postgresql://user:password@host:port/database
                Если не указана, пытается получить из переменных окружения или config.env
            minconn: Минимальное количество соединений в пуле
            maxconn: Максимальное количество соединений в пуле
        """
        if not connection_string:
            connection_string = self._get_connection_string()
        
        self.connection_string = connection_string
        
        # Создаем пул соединений
        try:
            self.pool = ThreadedConnectionPool(
                minconn=minconn,
                maxconn=maxconn,
                dsn=connection_string
            )
            print(f"Инициализирован DatabaseDataProvider. Подключение к БД установлено.")
        except Exception as e:
            raise ConnectionError(f"Не удалось подключиться к базе данных: {e}")
    
    def _get_connection_string(self) -> str:
        """Получает строку подключения из config.env или переменных окружения"""
        # Сначала пробуем из переменных окружения
        conn_string = os.getenv('DATABASE_URL') or os.getenv('CONN_STRING')
        if conn_string:
            print(f"DEBUG: Connection string from env: {conn_string}")
            return conn_string
        
        # Пробуем из config.env
        config_path = os.path.join(os.path.dirname(__file__), 'config.env')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('DATABASE_URL='):
                        conn_string = line.split('=', 1)[1].strip()
                        print(f"DEBUG: Connection string from config.env: {conn_string}")
                        return conn_string
                    elif line.startswith('CONN_STRING='):
                        conn_string = line.split('=', 1)[1].strip()
                        print(f"DEBUG: Connection string from config.env: {conn_string}")
                        return conn_string
        
        # Дефолтное подключение для разработки (обновлено для aura БД)
        default_conn = "postgresql://aura:aura@localhost:5432/aura"
        print(f"DEBUG: Using default connection string: {default_conn}")
        return default_conn
    
    def _get_connection(self):
        """Получает соединение из пула"""
        return self.pool.getconn()
    
    def _return_connection(self, conn):
        """Возвращает соединение в пул"""
        self.pool.putconn(conn)
    
    def _execute_query(self, query: str, params: tuple = None, fetch: bool = True) -> list:
        """Выполняет SQL запрос и возвращает результат"""
        conn = None
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                result = cur.fetchall() if fetch else []
                # Коммитим транзакцию для всех запросов (INSERT, UPDATE, DELETE)
                # Это важно для того, чтобы изменения были видны сразу
                conn.commit()
                return result
        except Exception as e:
            if conn:
                conn.rollback()
            raise Exception(f"Ошибка выполнения запроса: {e}")
        finally:
            if conn:
                self._return_connection(conn)
    
    # --- User Management & Settings ---
    
    def create_user(self, username: str, email: str, password_hash: str) -> int:
        query = """
            INSERT INTO users (username, email, password)
            VALUES (%s, %s, %s)
            RETURNING user_id, created_at
        """
        result = self._execute_query(query, (username, email, password_hash))
        return result[0]['user_id'] if result else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT user_id, username, email FROM users WHERE user_id = %s"
        result = self._execute_query(query, (user_id,))
        return dict(result[0]) if result else None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        query = "SELECT user_id, username, email FROM users WHERE email = %s"
        result = self._execute_query(query, (email,))
        return dict(result[0]) if result else None
    
    def get_ai_prompt_settings(self, user_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT user_id, words_for_prompt FROM ai_prompts_settings WHERE user_id = %s"
        result = self._execute_query(query, (user_id,))
        return dict(result[0]) if result else None
    
    def save_ai_prompt_settings(self, user_id: int, words_for_prompt: str) -> None:
        query = """
            INSERT INTO ai_prompts_settings (user_id, words_for_prompt)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO UPDATE SET words_for_prompt = EXCLUDED.words_for_prompt
        """
        self._execute_query(query, (user_id, words_for_prompt), fetch=False)
    
    def find_pending_report_id(self, user_id: int, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None) -> Optional[int]:
        """Ищет заявку на отчёт (status=pending) для user_id и диапазона дат. Возвращает report_id или None."""
        if date_from is None or date_to is None:
            return None
        d_from = date_from.date() if hasattr(date_from, 'date') else date_from
        d_to = date_to.date() if hasattr(date_to, 'date') else date_to
        query = """
            SELECT report_id FROM reports_history
            WHERE user_id = %s AND status = 'pending'
              AND date_from::date = %s AND date_to::date = %s
            ORDER BY requested_at DESC NULLS LAST
            LIMIT 1
        """
        result = self._execute_query(query, (user_id, d_from, d_to))
        return result[0]['report_id'] if result else None

    def update_report(self, report_id: int, report_content: str, methodology_type: Optional[str] = None) -> None:
        """Записывает текст отчёта в существующую заявку (после генерации). methodology_type: SOAP, DAP, BASIC ID, PIE."""
        if methodology_type:
            query = """
                UPDATE reports_history
                SET report = %s, log_datetime = CURRENT_TIMESTAMP, status = 'completed', methodology_type = %s
                WHERE report_id = %s
            """
            self._execute_query(query, (report_content, methodology_type, report_id), fetch=False)
        else:
            query = """
                UPDATE reports_history
                SET report = %s, log_datetime = CURRENT_TIMESTAMP, status = 'completed'
                WHERE report_id = %s
            """
            self._execute_query(query, (report_content, report_id), fetch=False)

    def save_report(
        self,
        user_id: int,
        report_content: str,
        log_datetime: datetime,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        methodology_type: Optional[str] = None,
    ) -> int:
        # Если есть заявка (pending) на этот диапазон дат — обновляем её; иначе создаём новую запись
        pending_id = self.find_pending_report_id(user_id, date_from, date_to)
        if pending_id is not None:
            self.update_report(pending_id, report_content, methodology_type)
            return pending_id
        if methodology_type:
            query = """
                INSERT INTO reports_history (user_id, log_datetime, report, date_from, date_to, status, methodology_type)
                VALUES (%s, %s, %s, %s, %s, 'completed', %s)
                RETURNING report_id
            """
            result = self._execute_query(query, (user_id, log_datetime, report_content, date_from, date_to, methodology_type))
        else:
            query = """
                INSERT INTO reports_history (user_id, log_datetime, report, date_from, date_to, status)
                VALUES (%s, %s, %s, %s, %s, 'completed')
                RETURNING report_id
            """
            result = self._execute_query(query, (user_id, log_datetime, report_content, date_from, date_to))
        return result[0]['report_id'] if result else None

    def get_reports_history(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        query = """
            SELECT report_id, user_id, log_datetime, report as report_content, methodology_type
            FROM reports_history
            WHERE user_id = %s AND log_datetime >= %s AND log_datetime <= %s
            ORDER BY log_datetime DESC
        """
        result = self._execute_query(query, (user_id, start_date, end_date))
        return pd.DataFrame(result) if result else pd.DataFrame()
    
    # --- Core Tracking ---
    
    def save_thought(
        self, 
        user_id: int, 
        created_at: datetime,  
        content: Optional[str], 
        type_thought: Optional[str] = None,  # ML will determine this during analysis
        voice_text: Optional[str] = None, 
        minio_id: Optional[str] = None,
        sentiment_label: Optional[str] = None, 
        sentiment_score: Optional[float] = None
    ) -> int:
        # Валидация: должно быть что-то одно - либо content, либо voice_text
        if content and voice_text:
            raise ValueError("Нельзя одновременно передавать content и voice_text. Должно быть что-то одно.")
        if not content and not voice_text:
            raise ValueError("Необходимо передать либо content, либо voice_text.")
        
        query = """
            INSERT INTO thoughts (user_id, created_at, content, voice_text, minio_id, type_thought, sentiment_label, sentiment_score)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING thought_id
        """
        result = self._execute_query(query, (
            user_id, created_at, content, voice_text, minio_id, 
            type_thought, sentiment_label, sentiment_score
        ))
        return result[0]['thought_id'] if result else None
    
    def get_thoughts(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        query = """
            SELECT 
                thought_id, user_id, created_at, 
                content, voice_text, minio_id
            FROM thoughts
            WHERE user_id = %s AND created_at >= %s AND created_at <= %s
            ORDER BY created_at DESC
        """
        result = self._execute_query(query, (user_id, start_date, end_date))
        return pd.DataFrame(result) if result else pd.DataFrame()
    
    def save_transcribed_voice(
        self,
        user_id: int,
        created_at: datetime,
        voice_text: str,
        type_thought: str = None  # ML will determine the category during analysis
    ) -> int:
        """
        Сохраняет транскрибированный голос как текстовую запись (voice_text) в таблицу thoughts.
        type_thought определяется ML частью во время анализа.
        """
        return self.save_thought(
            user_id=user_id,
            created_at=created_at,
            content=None,
            type_thought=type_thought,
            voice_text=voice_text,
            minio_id=None,
            sentiment_label=None,
            sentiment_score=None,
        )

    def save_thought_analysis(self, thought_id: int, user_id: int, thought_type: str, sentiment_label: str, sentiment_score: float, report: str = None) -> int:
        """Сохраняет анализ мысли - в БД анализ хранится в той же таблице thoughts"""
        conn = None
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                query = """
                    UPDATE thoughts 
                    SET type_thought = %s, sentiment_label = %s, sentiment_score = %s
                    WHERE thought_id = %s AND user_id = %s
                    RETURNING thought_id
                """
                cur.execute(query, (thought_type, sentiment_label, sentiment_score, thought_id, user_id))
                result = cur.fetchone()
                conn.commit()  # Явно коммитим изменения
                if result:
                    print(f"[DB] Successfully saved analysis for thought_id={thought_id}: type_thought='{thought_type}'")
                    return thought_id
                else:
                    print(f"[DB] WARNING: UPDATE did not affect any rows for thought_id={thought_id}, user_id={user_id}")
                    # ИСПРАВЛЕНИЕ: Проверяем, существует ли мысль
                    check_query = "SELECT thought_id, user_id, type_thought FROM thoughts WHERE thought_id = %s"
                    check_result = self._execute_query(check_query, (thought_id,))
                    if check_result:
                        print(f"[DB] DEBUG: Thought exists but UPDATE failed. Current data: {check_result[0]}")
                    else:
                        print(f"[DB] ERROR: Thought {thought_id} does not exist in database!")
                    return None
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"[DB] ERROR saving analysis for thought_id={thought_id}: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            if conn:
                self._return_connection(conn)  # ИСПРАВЛЕНИЕ: Используем _return_connection вместо close()
    
    def get_thought_analysis(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает анализ мыслей - в БД это часть таблицы thoughts"""
        query = """
            SELECT 
                thought_id, user_id, type_thought as thought_type, 
                sentiment_label, sentiment_score, 
                created_at as analyzed_at,
                '' as report
            FROM thoughts
            WHERE user_id = %s 
                AND created_at >= %s 
                AND created_at <= %s
                AND type_thought IS NOT NULL
            ORDER BY created_at DESC
        """
        result = self._execute_query(query, (user_id, start_date, end_date))
        return pd.DataFrame(result) if result else pd.DataFrame()
    
    def get_thoughts_with_analysis(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает мысли с анализом (из одной таблицы)"""
        query = """
            SELECT 
                t.thought_id, t.user_id, t.created_at,
                t.content, t.voice_text, t.minio_id,
                t.type_thought as thought_type, t.sentiment_label, t.sentiment_score
            FROM thoughts t
            WHERE t.user_id = %s AND t.created_at >= %s AND t.created_at <= %s
            ORDER BY t.created_at DESC
        """
        result = self._execute_query(query, (user_id, start_date, end_date))
        return pd.DataFrame(result) if result else pd.DataFrame()
    
    def get_thought_text(self, thought_id: int) -> Optional[str]:
        """Получает текст мысли (из content или voice_text)"""
        query = "SELECT content, voice_text FROM thoughts WHERE thought_id = %s"
        result = self._execute_query(query, (thought_id,))
        
        if not result:
            print(f"[get_thought_text] Thought ID {thought_id} not found in database")
            return None
        
        row = result[0]
        content = row.get('content')
        voice_text = row.get('voice_text')
        
        # Отладочная информация
        print(f"[get_thought_text] Thought ID {thought_id}: content={repr(content)}, voice_text={repr(voice_text)}")
        
        # Проверяем content (может быть None или пустая строка)
        if content and str(content).strip():
            print(f"[get_thought_text] Using content: {content[:50]}...")
            return str(content).strip()
        
        # Проверяем voice_text (может быть None или пустая строка)
        if voice_text and str(voice_text).strip():
            print(f"[get_thought_text] Using voice_text: {voice_text[:50]}...")
            return str(voice_text).strip()
        
        print(f"[get_thought_text] Both content and voice_text are empty for thought_id={thought_id}")
        return None
    
    def get_existing_type_thoughts(self, user_id: int) -> list:
        """
        Получает список уникальных type_thought (категорий) для данного пользователя.
        Возвращает список строк с названиями категорий.
        """
        query = """
            SELECT DISTINCT type_thought, COUNT(*) as count
            FROM thoughts
            WHERE user_id = %s AND type_thought IS NOT NULL AND type_thought != ''
            GROUP BY type_thought
            ORDER BY count DESC
        """
        result = self._execute_query(query, (user_id,))
        
        if not result:
            return []
        
        return [row['type_thought'] for row in result]
    
    def get_thoughts_by_type(self, user_id: int, start_date: datetime, end_date: datetime, is_voice: bool = None) -> pd.DataFrame:
        """Получает мысли по типу (текстовые или голосовые)"""
        if is_voice is True:
            # Только голосовые (voice_text не null, content null)
            query = """
                SELECT thought_id, user_id, created_at,
                       content, voice_text, minio_id
                FROM thoughts
                WHERE user_id = %s AND created_at >= %s AND created_at <= %s
                    AND voice_text IS NOT NULL AND content IS NULL
                ORDER BY created_at DESC
            """
        elif is_voice is False:
            # Только текстовые (content не null, voice_text null)
            query = """
                SELECT thought_id, user_id, created_at,
                       content, voice_text, minio_id
                FROM thoughts
                WHERE user_id = %s AND created_at >= %s AND created_at <= %s
                    AND content IS NOT NULL AND voice_text IS NULL
                ORDER BY created_at DESC
            """
        else:
            # Все мысли
            return self.get_thoughts(user_id, start_date, end_date)
        
        result = self._execute_query(query, (user_id, start_date, end_date))
        return pd.DataFrame(result) if result else pd.DataFrame()
    
    def get_unprocessed_thoughts(self, user_id: int) -> pd.DataFrame:
        """Получает необработанные мысли (с content или voice_text, но без sentiment_label, sentiment_score или type_thought)"""
        query = """
            SELECT 
                thought_id, user_id, created_at,
                content, voice_text, minio_id,
                type_thought, sentiment_label, sentiment_score
            FROM thoughts
            WHERE user_id = %s 
                AND (content IS NOT NULL OR voice_text IS NOT NULL)
                AND (sentiment_label IS NULL OR sentiment_score IS NULL OR type_thought IS NULL)
            ORDER BY created_at DESC
        """
        result = self._execute_query(query, (user_id,))
        return pd.DataFrame(result) if result else pd.DataFrame()
  
    def close(self):
        """Закрывает пул соединений"""
        if hasattr(self, 'pool'):
            self.pool.closeall()
    
    def __del__(self):
        """Деструктор - закрывает пул соединений"""
        try:
            self.close()
        except:
            pass


    def ensure_mind_score_column(self) -> None:
        """Добавляем колонку физически в БД"""
        query = """
            ALTER TABLE thoughts 
            ADD COLUMN IF NOT EXISTS mind_score FLOAT;
        """
        self._execute_query(query, fetch=False)

    def calculate_and_save_mind_score(self, user_id: int, thought_id: int) -> float:
        # 1. Считаем среднее арифметическое всех оценок пользователя, 
        # которые были сделаны ДО или В МОМЕНТ текущей записи (по created_at)
        
        # Получаем дату текущей записи, чтобы отфильтровать будущие (если вдруг порядок нарушен)
        # и считаем AVG по всем предыдущим.
        query_avg = """
            WITH current_thought AS (
                SELECT created_at FROM thoughts WHERE thought_id = %s
            )
            SELECT AVG(sentiment_score) as avg_score
            FROM thoughts
            WHERE user_id = %s 
              AND sentiment_score IS NOT NULL
              AND created_at <= (SELECT created_at FROM current_thought);
        """
        result = self._execute_query(query_avg, (thought_id, user_id))
        
        if not result or result[0]['avg_score'] is None:
            avg_score = 0.0
        else:
            avg_score = float(result[0]['avg_score'])
        
        # 2. Сохраняем рассчитанное значение в mind_score
        query_update = """
            UPDATE thoughts 
            SET mind_score = %s
            WHERE thought_id = %s AND user_id = %s
        """
        self._execute_query(query_update, (avg_score, thought_id, user_id), fetch=False)
        
        return avg_score
    
    def get_latest_mind_score(self, user_id: int) -> Optional[float]:
        """Возвращает последний сохраненный mind_score"""
        query = """
            SELECT mind_score
            FROM thoughts
            WHERE user_id = %s AND mind_score IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
        """
        result = self._execute_query(query, (user_id,))
        if not result:
            return None
        return result[0].get('mind_score')
    
    # --- Sport Activities (stub implementations) ---
    
    def save_sport_activity(
        self,
        user_id: int,
        activity_type: str,
        duration_minutes: int,
        distance_km: float = None,
        calories: int = None,
        log_datetime: datetime = None
    ) -> int:
        """
        Сохраняет спортивную активность (заглушка).
        Возвращает ID активности.
        """
        # Пока таблица sport_activities не создана, возвращаем заглушку
        print(f"STUB: save_sport_activity called for user {user_id}")
        return -1
    
    def get_sport_activities(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """
        Получает спортивные активности за период (заглушка).
        Возвращает пустой DataFrame.
        """
        print(f"STUB: get_sport_activities called for user {user_id}")
        return pd.DataFrame()