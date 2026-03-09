# -----------------------------------------------------------------------------
# signage バックエンド Dockerfile
# FastAPI + uvicorn で API サーバーを起動
# -----------------------------------------------------------------------------

FROM python:3.12-slim

WORKDIR /app

# 依存関係をコピーしてインストール
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションをコピー
COPY . .

# 本番では .env を使わず環境変数で設定すること
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
