# スタイル（assets/styles）

注文・看板管理システムの CSS ファイル群です。

## ファイル一覧

| ファイル | 読み込み元 | 役割 |
|----------|------------|------|
| `shared.css` | main.ts | モーダル・カード・ボタン・テーブル等の共通パターン |
| `common.css` | main.ts | ブランドカラー、body、キャレット、共通ヘッダー等 |
| `order-main.css` | OrderMain.vue | 注文入力ページ専用 |
| `order-list.css` | OrderList.vue | 注文一覧ページ専用 |
| `order-detail.css` | OrderDetail.vue | 注文詳細ページ専用 |
| `flatpickr-theme.css` | OrderMain.vue, OrderList.vue | Flatpickr 日付ピッカーのテーマ |

## 読み込み順

`main.ts` でグローバルに読み込まれる順序：

1. `shared.css`
2. `common.css`

ページ専用 CSS は各 Vue コンポーネント内で `import` されます。

## 詳細

スタイルの設計方針・共通クラス一覧は [STYLE.md](./STYLE.md) を参照してください。
