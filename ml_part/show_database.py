#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Показывает структуру и содержимое текущей БД aura
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from db_provider import DatabaseDataProvider

OUT = []

def log(s):
    OUT.append(s)
    print(s)

def main():
    log("=" * 80)
    log("BAZA DANNYKH: aura (PostgreSQL)")
    log("=" * 80)

    try:
        db = DatabaseDataProvider()
    except Exception as e:
        log("OSHIBKA PODKLYUCHENIYA: " + str(e))
        return

    # Список таблиц (public schema)
    q_tables = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """
    tables = db._execute_query(q_tables)
    table_names = [r['table_name'] for r in tables]

    if not table_names:
        log("\nTablic ne naydeno.")
        db.close()
        write_output()
        return

    for tname in table_names:
        log("\n" + "-" * 80)
        log("TABLICA: " + tname)
        log("-" * 80)

        # Колонки
        q_cols = """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """
        cols = db._execute_query(q_cols, (tname,))
        log("\nKolonki:")
        for c in cols:
            log("  - %s : %s (nullable: %s)" % (c['column_name'], c['data_type'], c['is_nullable']))

        # Количество строк
        try:
            cnt = db._execute_query("SELECT COUNT(*) as c FROM " + tname)[0]['c']
            log("\nKolichestvo strok: %s" % cnt)
        except Exception as e:
            log("\nKolichestvo strok: (oshibka: %s)" % str(e))
            cnt = 0

        # Пример данных (первые 3 строки, длинные поля обрезаем)
        if cnt > 0:
            try:
                # Получаем имена колонок
                col_names = [c['column_name'] for c in cols]
                cols_str = ", ".join('"%s"' % c for c in col_names)
                sample = db._execute_query(
                    "SELECT * FROM " + tname + " ORDER BY 1 LIMIT 3"
                )
                log("\nPrimer dannykh (do 3 strok):")
                for i, row in enumerate(sample, 1):
                    log("  [%d] " % i)
                    for k, v in row.items():
                        if v is None:
                            log("      %s: NULL" % k)
                        elif isinstance(v, str) and len(v) > 80:
                            log("      %s: %s..." % (k, repr(v[:80])))
                        else:
                            log("      %s: %s" % (k, repr(v)))
            except Exception as e:
                log("\nPrimer dannykh: (oshibka: %s)" % str(e))

    db.close()
    log("\n" + "=" * 80)
    log("Konec obzora.")
    log("=" * 80)
    write_output()

def write_output():
    out_path = os.path.join(os.path.dirname(__file__), "database_schema.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(OUT))
    print("\n[Zapisano v: %s]" % out_path)

if __name__ == "__main__":
    main()
