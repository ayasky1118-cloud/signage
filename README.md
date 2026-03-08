# 簡易地図作成アプリ-仮称

フロントエンド（Vue 3）とバックエンド（FastAPI）を組み合わせたプロジェクト。
ローカル開発では MySQL（Docker）、本番は AWS Lambda 上での動作を想定。

**地図看板の作成には [MapTiler](https://www.maptiler.com/) を利用しています。** 商用利用のため MapTiler との契約を締結済み、または締結を進めています。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| **フロントエンド** | Vue 3, Vite, Vue Router, TypeScript, CSS（shared.css / common.css / 画面別） |
| **バックエンド** | Python 3.12, FastAPI, SQLAlchemy 2.x |
| **データベース** | MySQL 8.0（Docker） |
| **インフラ** | AWS SAM（ローカル開発 / 本番デプロイ） |

---

## ディレクトリ構成

```
signage/
├── frontend/           # Vue 3 + Vite + Vue Router
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
│   │   └── routers/    # APIルーター（/companies, /orders など）
│   └── requirements.txt
│
├── docs/               # 手順書・仕様書
│   ├── 101.環境構築ステップ.md
│   ├── 102.Node・npm 環境確認.md
│   └── ...（詳細は docs/README.md）
│
└── docker-compose.yml  # MySQL用（プロジェクトルート）
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

signage プロジェクトのルートで実行する。

```bash
docker compose up -d
```

**データのバックアップ（推奨）**  
コンテナ入れ替えやスキーマ変更の前に、`./db/backup.sh` を実行すると `db/backups/` にダンプが保存されます。

### 2. フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173/` を開く（メニュー画面が表示されます）。再起動時は 5175 等になる場合あり。`npm run dev` の表示を確認すること。

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
| `GET /address/validate?address=...` | 住所検証（MapTiler Geocoding） |
| `GET /address/geocode?address=...` | ジオコーディング（住所→座標。看板編集の地図表示用） |

**MapTiler API キー（住所検証・地図表示）**  
- **バックエンド**: `backend/.env` に `MAPTILER_API_KEY` を設定（住所検証・ジオコーディング用）。未設定時は住所検証をスキップ。  
- **フロントエンド**: `frontend/.env` に `VITE_MAPTILER_API_KEY` を設定（地図タイル表示用）。未設定時は看板編集画面の地図に「VITE_MAPTILER_API_KEY を設定してください」と表示。  
- 取得手順: [docs/101.環境構築ステップ.md](docs/101.環境構築ステップ.md) の「手順 1-5：MapTiler API キーの取得」を参照。  
- 詳細: [docs/203.本番環境の環境変数.md](docs/203.本番環境の環境変数.md)

---

## ドキュメント

| 内容 | 参照先 |
|------|--------|
| 環境構築・開発手順の一覧 | [docs/README.md](docs/README.md) |
