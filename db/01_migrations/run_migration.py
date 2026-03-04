#!/usr/bin/env python3
"""
既存DBの design_type 移行を実行するスクリプト。

実行方法（backend で .env の DATABASE_URL が読まれる想定）:
  cd map_pj/backend && python -c "
  import sys
  sys.path.insert(0, '.')
  from pathlib import Path
  from sqlalchemy import create_engine, text
  from app.core.config import settings

  engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
  root = Path(__file__).resolve().parent.parent  # map_pj
  " 
  
または backend から:
  cd map_pj && python db/01_migrations/run_migration.py
"""
from pathlib import Path
import sys

# backend を path に追加（app.core.config のため）
_map_pj = Path(__file__).resolve().parent.parent.parent  # 01_migrations -> db -> map_pj
sys.path.insert(0, str(_map_pj / "backend"))

from sqlalchemy import create_engine, text
from app.core.config import settings


def run_sql_file(engine, path: Path) -> None:
    """SQL ファイルを実行（複数文対応のため 1 文ずつ実行）"""
    sql = path.read_text(encoding="utf-8")
    # ; で区切って実行。ブロック先頭の -- コメント行は MySQL が無視するのでそのまま実行する
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    with engine.connect() as conn:
        for stmt in statements:
            if stmt:
                conn.execute(text(stmt))
        conn.commit()


def main() -> None:
    schema_dir = _map_pj / "db" / "00_schema"
    migration_dir = _map_pj / "db" / "01_migrations"

    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    print("接続先:", settings.DATABASE_URL.replace("password", "****"))

    # 1. design_type テーブル作成（既にあればスキップ）
    path_007 = schema_dir / "007_design_type.sql"
    print(f"\n[1/2] {path_007.name} を実行します...")
    run_sql_file(engine, path_007)
    print("  OK")

    # 2. order_main の design_type → design_type_id 移行
    path_mig = migration_dir / "001_order_main_design_type_to_master.sql"
    print(f"\n[2/2] {path_mig.name} を実行します...")
    run_sql_file(engine, path_mig)
    print("  OK")

    # 検証: この接続先の order_main の列を表示（DBeaver と接続先が同じか確認用）
    print("\n[検証] 接続先の order_main の列一覧:")
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS cols "
            "FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_main'"
        )).fetchone()
    if row and row[0]:
        print(f"  {row[0]}")
        if "design_type_id" in row[0] and "design_type" not in row[0].replace("design_type_id", ""):
            print("  → design_type_id に移行済みです。")
        else:
            print("  → design_type が残っている、または design_type_id がありません。")
            print("    DBeaver の接続先（ホスト・ポート・DB名）が上記「接続先」と同一か確認してください。")
    else:
        print("  (order_main が見つかりません)")

    print("\nマイグレーションが完了しました。")


if __name__ == "__main__":
    main()
