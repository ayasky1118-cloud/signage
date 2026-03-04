"""
データベース接続とセッション管理を行うモジュール。

役割：
・SQLAlchemy Engine の生成
・DBセッション生成
・FastAPIの依存性注入用 get_db()
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


# =============================
# Engine生成
# =============================
# EngineはDB接続の実体。
# pool_pre_ping=True により接続が死んでいる場合に自動再接続する。
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)


# =============================
# Session生成クラス
# =============================
# autocommit=False:
#   明示的にcommitしない限り保存されない
#
# autoflush=False:
#   自動でflushしない（制御しやすくなる）
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


# =============================
# FastAPI用DB依存関数
# =============================
def get_db():
    """
    1リクエストごとにDBセッションを生成し、
    処理終了後に必ずcloseする。

    これにより
    ・コネクションリーク防止
    ・トランザクション管理が明確になる
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()