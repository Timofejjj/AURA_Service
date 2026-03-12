# -*- coding: utf-8 -*-
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_provider import DatabaseDataProvider


def main() -> int:
    db = DatabaseDataProvider()
    db._execute_query(
        """
        CREATE TABLE IF NOT EXISTS reader_settings (
          user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
          theme VARCHAR(10) NOT NULL DEFAULT 'light',
          font_family VARCHAR(20) NOT NULL DEFAULT 'SF',
          font_size INTEGER NOT NULL DEFAULT 16,
          font_weight INTEGER NOT NULL DEFAULT 400,
          ligatures BOOLEAN NOT NULL DEFAULT TRUE,
          line_height NUMERIC NOT NULL DEFAULT 1.45,
          text_align VARCHAR(10) NOT NULL DEFAULT 'left',
          brightness NUMERIC NOT NULL DEFAULT 1.0,
          transitions BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        fetch=False,
    )
    db._execute_query(
        "CREATE INDEX IF NOT EXISTS idx_reader_settings_updated_at ON reader_settings(updated_at)",
        fetch=False,
    )
    print("reader_settings migration applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

