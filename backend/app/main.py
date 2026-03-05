"""
FastAPIアプリケーションのエントリーポイント。

責務：
・FastAPIインスタンス生成
・Router登録
・ミドルウェア設定（CORSなど）
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 追加したルーター（DB疎通確認用）
from app.routers.address import router as address_router
from app.routers.company import router as company_router
from app.routers.customer import router as customer_router
from app.routers.design_type import router as design_type_router
from app.routers.order import router as order_router
from app.routers.template import router as template_router
from app.routers.template_item import router as template_item_router


# =============================
# FastAPIアプリ生成
# =============================
app = FastAPI(
    title="Map Sign Project API",
    version="0.1.0"
)

# =============================
# CORS設定
# =============================
# フロントエンド（Vue）からAPIを呼び出すために必要。
# 開発中は localhost / 127.0.0.1 の任意ポートを許可（Vite が 5173〜5175 等を使うため）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# Router登録
# =============================
# /companies を有効化（DB疎通確認のため）
app.include_router(address_router)
app.include_router(company_router)
app.include_router(customer_router)
app.include_router(design_type_router)
app.include_router(template_router)
app.include_router(template_item_router)
# 注文一覧検索
app.include_router(order_router)

# =============================
# ヘルスチェック用エンドポイント
# =============================
# AWS環境やALBのヘルスチェックにも利用可能
@app.get("/health")
def health_check():
    """
    アプリが正常に起動しているか確認するためのAPI。
    """
    return {"status": "ok"}