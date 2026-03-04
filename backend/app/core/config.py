"""
アプリケーション全体の設定を管理するモジュール。

・環境変数の読み込みを一元化する
・ローカル / SAM Local / 本番AWS の差異を吸収する
"""

from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env を確実に読み込む（実行場所に依存しない）
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)


class Settings(BaseSettings):
    """
    環境変数を読み込む設定クラス。

    - .env があればそこから読む（backend/.env）
    - 環境変数が優先される
    - extra="ignore" により不要な環境変数があってもエラーにしない
    """
    model_config = SettingsConfigDict(
        env_file=_ENV_PATH,
        extra="ignore"
    )

    # =============================
    # DB接続URL
    # =============================
    # デフォルト: ローカル開発（docker compose + uvicorn 直接起動）用
    # - SAM Local 利用時: DATABASE_URL=mysql+pymysql://root:password@db:3306/signage_dev?charset=utf8mb4
    # - 本番: Lambda の環境変数で上書き
    DATABASE_URL: str = (
        "mysql+pymysql://root:password@127.0.0.1:3306/signage_dev?charset=utf8mb4"
    )


# アプリ全体で使い回す設定インスタンス
settings = Settings()