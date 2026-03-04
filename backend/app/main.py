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
from app.routers.company import router as company_router


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
# 開発中はローカルのみ許可するのが安全。
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite標準
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# Router登録
# =============================
# /companies を有効化（DB疎通確認のため）
app.include_router(company_router)

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