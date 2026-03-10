# signage フロントエンド

注文・看板管理システムのフロントエンド。Vue 3 + TypeScript + Vite で構築。

## 認証

- **Cognito（Amplify Authenticator）**: 未ログイン時はログイン画面を表示。
- **user マスタ突合**: ログイン成功後、auth_uid（Cognito sub）で user マスタを検索。マスタに存在しない場合は「ログインできません」を表示し、signOut する。
- **AuthGuard**: ログイン後の突合処理を行うコンポーネント（`App.vue` → `Authenticator` → `AuthGuard` → `DefaultLayout`）。

## 主な機能

- **メニュー**: 注文一覧・注文登録・看板編集への導線
- **注文一覧**: 検索・ソート・ページネーション。行ダブルクリックで詳細モーダル
- **注文（新規・変更）**: 注文の登録・編集。顧客・テンプレート選択、住所検証、地図プレビュー
- **看板編集**: 地図上でルート・テキスト・画像・吹き出しを配置。枝番タブで複数デザインを管理

## 技術スタック

- Vue 3, Vue Router
- AWS Amplify（Cognito 認証）
- TypeScript
- Vite
- MapLibre GL（地図）
- Flatpickr（日付ピッカー）

## 前提条件

- Node.js 18+
- バックエンド API（デフォルト: http://localhost:8000）

## セットアップ

```bash
npm install
cp .env.example .env
# .env を編集して環境変数を設定
```

## 環境変数

| 変数 | 説明 | 必須 |
|------|------|------|
| `VITE_MAPTILER_API_KEY` | MapTiler API キー（地図表示用） | ○ |
| `VITE_API_BASE` | API のベース URL。環境別 .env で管理（development は未設定でプロキシ使用） | - |
| `VITE_LOGIN_COMPANY_ID` | ログイン会社 ID。未設定時は 1 | - |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID（認証用。main.ts で Amplify に渡す） | - |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Cognito App Client ID（認証用） | - |

`.env.example` をコピーして `.env` を作成し、`VITE_MAPTILER_API_KEY` を設定してください。Cognito 認証を使う場合は `VITE_COGNITO_USER_POOL_ID` と `VITE_COGNITO_USER_POOL_CLIENT_ID` も設定してください。

### 環境別設定（ローカル・検証・本番）

- `npm run dev` → `.env.development`（VITE_API_BASE 未設定、プロキシ使用）
- `npm run build:staging` → `.env.staging`（検証用 API URL）
- `npm run build` / `npm run build:production` → `.env.production`（本番 API URL）

## 開発

```bash
npm run dev
```

http://localhost:5173 で起動。`/api` は http://localhost:8000 にプロキシされます。

## ビルド

```bash
npm run build              # 本番用（.env.production）
npm run build:staging      # 検証用（.env.staging）
npm run build:production   # 本番用（同上）
npm run preview            # ビルド結果のプレビュー
```
