#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Добавляет в БД несколько заглушек-отчётов для пользователя Timaa (или Tima),
чтобы они отображались на странице с отчётами.
"""
import os
import sys
from datetime import datetime, timedelta

# Добавляем путь к ml_part для импортов
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_provider import DatabaseDataProvider

# Заглушки отчётов (Markdown-текст)
STUB_REPORTS = [
    """# Недельный отчёт (заглушка 1)

## Обзор периода
За эту неделю вы сделали несколько записей в дневнике. Общее настроение стабильное.

## Основные темы
- Работа и планы
- Отдых и восстановление

## Рекомендации
Продолжайте регулярно фиксировать мысли — это помогает отслеживать динамику.""",

    """# Недельный отчёт (заглушка 2)

## Карта внутреннего опыта
Краткий обзор ваших записей за период.

## Настроение
Средний показатель настроения за неделю в норме.

## Что заметить
Обратите внимание на повторяющиеся темы в мыслях — они могут указывать на важные области для проработки.""",

    """# Недельный отчёт (заглушка 3)

## Итоги недели
Несколько записей отражают текущую ситуацию и планы.

## Эмоции
Преобладают нейтральные и положительные оттенки.

## Совет
Используйте методики разбора мыслей для более глубокого понимания переживаний.""",
]

# Методологии для заглушек (записываются в специальный столбец reports_history.methodology_type)
STUB_METHODOLOGIES = [
    "SOAP",
    "DAP",
    "BASIC ID",
]


def main():
    db = DatabaseDataProvider()

    # Ищем пользователя Timaa или Tima (регистронезависимо)
    users = db._execute_query(
        "SELECT user_id, username FROM users WHERE LOWER(username) IN ('timaa', 'tima')"
    )
    if not users:
        print("Пользователь с именем 'Timaa' или 'Tima' не найден в БД.")
        print("Доступные пользователи:")
        all_users = db._execute_query("SELECT user_id, username FROM users ORDER BY user_id")
        for u in all_users:
            print(f"  - user_id={u['user_id']}, username={u['username']}")
        return 1

    user = users[0]
    user_id = user["user_id"]
    username = user["username"]
    print(f"Найден пользователь: {username} (user_id={user_id})")

    base_date = datetime.now()
    inserted = 0
    for i, report_text in enumerate(STUB_REPORTS):
        methodology_type = STUB_METHODOLOGIES[i] if i < len(STUB_METHODOLOGIES) else None
        date_to = base_date - timedelta(days=i * 7)
        date_from = date_to - timedelta(days=6)
        log_dt = date_to
        requested_at = date_to

        db._execute_query(
            """
            INSERT INTO reports_history
            (user_id, log_datetime, report, date_from, date_to, status, requested_at, methodology_type)
            VALUES (%s, %s, %s, %s, %s, 'completed', %s, %s)
            """,
            (user_id, log_dt, report_text, date_from, date_to, requested_at, methodology_type),
            fetch=False,
        )
        inserted += 1
        print(f"  Добавлен отчёт {inserted}: период {date_from.date()} — {date_to.date()} | methodology_type={methodology_type}")

    print(f"\nГотово. Добавлено отчётов: {inserted}. Они отобразятся на странице отчётов для {username}.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
