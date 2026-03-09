"""
Lambda 用エントリーポイント。

API Gateway からのリクエストを FastAPI アプリに渡す。
Mangum が ASGI (FastAPI) を Lambda のイベント形式に変換する。
"""

from mangum import Mangum

from app.main import app

# API Gateway のプロキシ統合用。パス・メソッドをそのまま FastAPI に渡す
handler = Mangum(app, lifespan="off")
