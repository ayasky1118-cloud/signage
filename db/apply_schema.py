#!/usr/bin/env python3
"""
00_schema の DDL を順に実行し、DB を定義書どおりに反映します。

実行方法（backend の .env の DATABASE_URL を使用）:
  cd /path/to/signage
  PYTHONPATH=backend backend/.venv/bin/python db/apply_schema.py
  # または venv 有効時:  PYTHONPATH=backend python db/apply_schema.py

オプション:
  --reset  実行前に 000_drop_all.sql で全テーブルを削除してから 001〜010 を実行（データは消えます）
"""
from pathlib import Path
import sys
import argparse

# backend を path に追加（app.core.config のため）
_signage = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_signage / "backend"))

from sqlalchemy import create_engine, text
from app.core.config import settings


def run_sql_file(engine, path: Path) -> None:
    """SQL ファイルを実行（複数文対応のため 1 文ずつ実行）"""
    sql = path.read_text(encoding="utf-8")
    # ; で区切って実行。ブロック先頭の -- コメントは DB が無視する
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    with engine.connect() as conn:
        for stmt in statements:
            if stmt:
                conn.execute(text(stmt))
        conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="00_schema の DDL を順に実行")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="先に 000_drop_all.sql を実行してから 001〜010 を実行（データ削除）",
    )
    args = parser.parse_args()

    schema_dir = _signage / "db" / "00_schema"
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    print("接続先:", settings.DATABASE_URL.replace("password", "****"))
    print()

    if args.reset:
        path_000 = schema_dir / "000_drop_all.sql"
        print(f"[0] {path_000.name} を実行します...")
        run_sql_file(engine, path_000)
        print("  OK\n")

    # 001 〜 010 を番号順に実行
    for i in range(1, 11):
        name = f"{i:03d}_*.sql"
        files = sorted(schema_dir.glob(f"{i:03d}_*.sql"))
        if not files:
            continue
        path = files[0]
        print(f"[{i}] {path.name} を実行します...")
        try:
            run_sql_file(engine, path)
            print("  OK")
        except Exception as e:
            print(f"  NG: {e}")
            sys.exit(1)
    print("\nスキーマの適用が完了しました。")


if __name__ == "__main__":
    main()
