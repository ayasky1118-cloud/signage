"""
アプリケーション全体の設定を管理するモジュール。

・環境変数の読み込みを一元化する
・ローカル: backend/.env を参照（.env.example をコピーして .env を作成）
・本番: 実行環境の環境変数で指定（.env に頼らない）
・常に「環境変数 > .env」の優先順位で読む
"""

from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env（存在する場合のみ。本番では存在しない想定）
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if _ENV_PATH.exists():
    load_dotenv(_ENV_PATH)


class Settings(BaseSettings):
    """
    環境変数を読み込む設定クラス。

    - 環境変数が最優先。未設定時のみ .env の値を使う
    - 本番では DATABASE_URL, MAPTILER_API_KEY 等を環境変数で設定すること
    - extra="ignore" により不要な環境変数があってもエラーにしない
    """
    model_config = SettingsConfigDict(
        env_file=_ENV_PATH if _ENV_PATH.exists() else None,
        extra="ignore",
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

    # =============================
    # MapTiler（住所検証・ジオコーディング）
    # =============================
    # 本番: 環境変数 MAPTILER_API_KEY で設定。未設定時は住所検証をスキップする。
    MAPTILER_API_KEY: str | None = None


# アプリ全体で使い回す設定インスタンス
settings = Settings()