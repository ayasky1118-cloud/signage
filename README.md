# Map Sign Project

フロントエンド（Vue 3）とバックエンド（FastAPI）を組み合わせたフルスタックプロジェクト。  
ローカル開発では MySQL（Docker）、本番は AWS Lambda 上での動作を想定。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| **フロントエンド** | Vue 3, Vite, Vue Router, Tailwind CSS v4, TypeScript |
| **バックエンド** | Python 3.12, FastAPI, SQLAlchemy 2.x |
| **データベース** | MySQL 8.0（Docker） |
| **インフラ** | AWS SAM（ローカル開発 / 本番デプロイ） |

---

## ディレクトリ構成

```
signage/
├── frontend/           # Vue 3 + Vite + Vue Router + Tailwind
│   ├── src/
│   │   ├── pages/      # ページコンポーネント（Menu, OrderList など）
│   │   ├── components/
│   │   └── router/
│   └── package.json
│
├── backend/            # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py     # エントリポイント（CORS, Router登録）
│   │   ├── core/       # 設定（config.py）
│   │   ├── db/         # DB接続（session.py）
│   │   ├── models/     # SQLAlchemyモデル
│   │   ├── schemas/    # Pydanticスキーマ
│   │   └── routers/    # APIルーター（/companies など）
│   └── requirements.txt
│
├── docs/               # 手順書・仕様書
│   ├── 101.環境構築ステップ.md
│   ├── 102.Node・npm 環境確認.md
│   └── ...（詳細は docs/README.md）
│
└── docker-compose.yml  # MySQL用（プロジェクトルートに配置予定）
```

---

## クイックスタート

### 初回セットアップ

初めてプロジェクトを動かす場合は、[docs/101.環境構築ステップ.md](docs/101.環境構築ステップ.md) に従って以下を準備してください。

- Docker Desktop（MySQL用）
- Node.js v18以上
- Python 3.12
- AWS CLI & AWS SAM CLI

### 1. MySQL 起動

```bash
docker compose up -d
```

### 2. フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173/` を開く（メニュー画面が表示されます）。

### 3. バックエンド起動（オプション）

API を利用する場合：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API は `http://localhost:8000` で動作します。

| エンドポイント | 説明 |
|----------------|------|
| `GET /health` | ヘルスチェック |
| `GET /companies` | 会社一覧（DB疎通確認用） |

---

## ドキュメント

| 内容 | 参照先 |
|------|--------|
| 環境構築・開発手順の一覧 | [docs/README.md](docs/README.md) |
| 機能制御仕様 | [docs/mock/docs/機能制御仕様.md](docs/mock/docs/機能制御仕様.md) |
