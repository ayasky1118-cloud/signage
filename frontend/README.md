# signage フロントエンド

注文・看板管理システムのフロントエンド。Vue 3 + TypeScript + Vite で構築。

## 主な機能

- **メニュー**: 注文一覧・注文登録・看板編集への導線
- **注文一覧**: 検索・ソート・ページネーション。行ダブルクリックで詳細モーダル
- **注文（新規・変更）**: 注文の登録・編集。顧客・テンプレート選択、住所検証、地図プレビュー
- **看板編集**: 地図上でルート・テキスト・画像・吹き出しを配置。枝番タブで複数デザインを管理

## 技術スタック

- Vue 3, Vue Router
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
| `VITE_API_BASE` | API のベース URL。未設定時は `/api` をプロキシ経由で使用 | - |
| `VITE_LOGIN_COMPANY_ID` | ログイン会社 ID。未設定時は 1 | - |

`.env.example` をコピーして `.env` を作成し、`VITE_MAPTILER_API_KEY` を設定してください。

## 開発

```bash
npm run dev
```

http://localhost:5173 で起動。`/api` は http://localhost:8000 にプロキシされます。

## ビルド

```bash
npm run build
npm run preview   # ビルド結果のプレビュー
```
