#!/usr/bin/env python3
"""
DB接続確認用スクリプト。

使い方:
  cd backend
  source .venv/bin/activate
  python check_db.py
"""

import sys
from app.core.config import settings
from sqlalchemy import create_engine, text

def main():
    print("=== DB接続確認 ===\n")
    print(f"接続先: {settings.DATABASE_URL.replace('password', '****')}\n")

    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            # 接続テスト
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
            print("✅ 接続成功！\n")

            # company テーブル確認
            try:
                rows = conn.execute(
                    text("SELECT * FROM company WHERE is_deleted = 0 ORDER BY company_id")
                ).fetchall()
                print(f"✅ company テーブル: {len(rows)} 件\n")
                if rows:
                    for row in rows[:5]:
                        print(f"  - {row}")
            except Exception as e:
                print(f"⚠️ company テーブル: {e}\n")
                print("  → db/00_schema/ のSQLを実行してテーブルを作成してください")

        return 0
    except Exception as e:
        print(f"❌ 接続失敗: {e}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
