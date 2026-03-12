# Объявление абстрактных методов которые есть на проекте


from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
import pandas as pd



class AbstractDataProvider(ABC):
    
    # --- User Management & Settings (Управление пользователями и настройками) ---

    @abstractmethod
    def create_user(self, username: str, email: str, password_hash: str) -> int:
        """Создает нового пользователя и возвращает его ID."""
        pass

    @abstractmethod
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Находит пользователя по его ID."""
        pass

    @abstractmethod
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Находит пользователя по его email."""
        pass
    
    @abstractmethod
    def get_ai_prompt_settings(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Получает персональные настройки промптов для ИИ."""
        pass

    @abstractmethod
    def save_ai_prompt_settings(self, user_id: int, words_for_prompt: str) -> None:
        """Сохраняет или обновляет настройки промптов для пользователя."""
        pass

    @abstractmethod
    def save_report(self, user_id: int, report_content: str, log_datetime: datetime, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None) -> int:
        """Сохраняет сгенерированный отчет в историю."""
        pass

    @abstractmethod
    def get_reports_history(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает историю отчетов за период."""
        pass

    # --- Core Tracking (Основной трекинг) ---

    @abstractmethod
    def save_thought(
        self, 
        user_id: int, 
        created_at: datetime, 
        submitted_at: datetime, 
        content: Optional[str], 
        thought_type: str,
        voice_text: Optional[str] = None, 
        image_id: Optional[str] = None,
        sentiment_label: Optional[str] = None, 
        sentiment_score: Optional[float] = None
    ) -> int:
        """Сохраняет новую мысль. Должно быть передано либо content, либо voice_text (но не оба одновременно)."""
        pass

    @abstractmethod
    def get_thoughts(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает все мысли пользователя за период."""
        pass
    
    @abstractmethod
    def save_thought_analysis(self, thought_id: int, user_id: int, thought_type: str, sentiment_label: str, sentiment_score: float, report: str = None) -> int:
        """Сохраняет анализ мысли в отдельную таблицу."""
        pass
    
    @abstractmethod
    def get_thought_analysis(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает анализ мыслей за период."""
        pass
    
    @abstractmethod
    def get_thoughts_with_analysis(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает мысли с анализом (JOIN)."""
        pass

    @abstractmethod
    def save_transcribed_voice(
        self,
        user_id: int,
        created_at: datetime,
        submitted_at: datetime,
        voice_text: str,
        thought_type: str = "voice"
    ) -> int:
        """Сохраняет транскрибированный голос (текст помещается в колонку voice_text)."""
        pass



        


    @abstractmethod
    def save_sport_activity(
        self,
        user_id: int,
        activity_type: str,
        start_time: datetime,
        end_time: datetime,
        pre_activity_motivation: int,
        post_activity_motivation: int
    ) -> int:
        """Сохраняет спортивную активность."""
        pass
    
    @abstractmethod
    def get_sport_activities(self, user_id: int, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Получает спортивные активности за период."""
        pass

    
    # Добавили новое поле в таблицу thought
    @abstractmethod
    def ensure_mind_score_column(self) -> None:
        """Создает колонку mind_score в таблице thoughts, если её нет."""
        pass

    @abstractmethod
    def calculate_and_save_mind_score(self, user_id: int, thought_id: int) -> float:
        """
        Считает средний sentiment_score от начала времен до текущей мысли 
        и сохраняет его в mind_score. Возвращает рассчитанное значение.
        """
        pass



    # --- Goals (Цели) ---