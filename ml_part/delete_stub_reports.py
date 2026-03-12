# -*- coding: utf-8 -*-
"""
Удаляет заглушки-отчёты, которые ранее были добавлены для пользователя Timaa.
Удаление идёт по уникальным подстрокам в поле report.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_provider import DatabaseDataProvider


def main() -> int:
    db = DatabaseDataProvider()

    user = db._execute_query("SELECT user_id, username FROM users WHERE LOWER(username)='timaa'")
    if not user:
        print("User 'Timaa' not found.")
        return 1

    uid = user[0]["user_id"]
    print(f"Found user: {user[0]['username']} (user_id={uid})")

    q = """
        DELETE FROM reports_history
        WHERE user_id=%s
          AND report IS NOT NULL
          AND (
            report LIKE %s OR
            report LIKE %s OR
            report LIKE %s
          )
        RETURNING report_id
    """
    rows = db._execute_query(
        q,
        (
            uid,
            "%Недельный отчёт (заглушка 1)%",
            "%Недельный отчёт (заглушка 2)%",
            "%Недельный отчёт (заглушка 3)%",
        ),
    )

    deleted_ids = [r["report_id"] for r in rows] if rows else []
    print("Deleted report_ids:", deleted_ids)

    left = db._execute_query("SELECT COUNT(*) AS c FROM reports_history WHERE user_id=%s", (uid,))
    print("Reports left for Timaa:", left[0]["c"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

