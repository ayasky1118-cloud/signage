"""
DB接続およびセッション管理モジュール。

責務：
・SQLAlchemy Engine の生成
・DBセッション（SessionLocal）の生成
・FastAPIのDependsで使用する get_db() の提供

設計方針：
・1リクエスト = 1セッション
・処理終了時に必ず close() してコネクションリークを防ぐ
・DATABASE_URL は app.core.config から取得（.env / 環境変数で上書き可能）
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


# -----------------------------------------------------------------------------
# DB接続URL
# -----------------------------------------------------------------------------
# config から一元取得（.env の DATABASE_URL で上書き可能）
DATABASE_URL = settings.DATABASE_URL


# -----------------------------------------------------------------------------
# Engine生成
# -----------------------------------------------------------------------------
# EngineはDB接続の実体。
# pool_pre_ping=True により、切断された接続を自動検知し再接続する。
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# -----------------------------------------------------------------------------
# セッションファクトリ生成
# -----------------------------------------------------------------------------
# SessionLocalは「セッションを作るためのクラス」。
# 実際の接続はここから生成される。
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


# -----------------------------------------------------------------------------
# FastAPI用 セッション供給関数
# -----------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """
    FastAPIのDependsで使用するDBセッション取得関数。

    1リクエストごとにセッションを生成し、
    処理終了後に必ずclose()することで
    コネクションリークを防止する。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()