"""
FastAPIアプリケーションのエントリーポイント。

責務：
・FastAPIインスタンス生成
・Router登録
・ミドルウェア設定（CORSなど）
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.address import router as address_router
from app.routers.company import router as company_router
from app.routers.customer import router as customer_router
from app.routers.design_type import router as design_type_router
from app.routers.html_object import router as html_object_router
from app.routers.order import router as order_router
from app.routers.template import router as template_router
from app.routers.template_item import router as template_item_router
from app.routers.user import router as user_router


# -----------------------------------------------------------------------------
# FastAPIアプリ生成
# -----------------------------------------------------------------------------
app = FastAPI(
    title="Map Sign Project API",
    version="0.1.0"
)

# -----------------------------------------------------------------------------
# CORS設定
# -----------------------------------------------------------------------------
# フロントエンド（Vue）からAPIを呼び出すために必要。
# 開発中: localhost / 127.0.0.1 は allow_origin_regex で許可
# Lambda + Amplify: CORS_ORIGINS に Amplify の URL をカンマ区切りで設定
# 例: CORS_ORIGINS=https://main.xxxxx.amplifyapp.com,https://custom-domain.com
_cors_origins = os.environ.get("CORS_ORIGINS", "")
_cors_origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins_list,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# API プレフィックス
# -----------------------------------------------------------------------------
# API Gateway のステージ名（例: /prod, /dev）を環境変数で設定する。
# ローカル開発時は未設定（空）のまま。
API_PREFIX = os.environ.get("API_PREFIX", "")

# -----------------------------------------------------------------------------
# Router登録
# -----------------------------------------------------------------------------
app.include_router(address_router, prefix=API_PREFIX)
app.include_router(company_router, prefix=API_PREFIX)
app.include_router(customer_router, prefix=API_PREFIX)
app.include_router(design_type_router, prefix=API_PREFIX)
app.include_router(html_object_router, prefix=API_PREFIX)
app.include_router(template_router, prefix=API_PREFIX)
app.include_router(template_item_router, prefix=API_PREFIX)
app.include_router(user_router, prefix=API_PREFIX)
app.include_router(order_router, prefix=API_PREFIX)

# -----------------------------------------------------------------------------
# ヘルスチェック用エンドポイント
# -----------------------------------------------------------------------------
# API Gateway 経由のヘルスチェックにも利用可能。API_PREFIX が /prod の場合は /prod/health で応答
@app.get(f"{API_PREFIX}/health")
def health_check():
    """
    アプリが正常に起動しているか確認するためのAPI。
    """
    return {"status": "ok"}