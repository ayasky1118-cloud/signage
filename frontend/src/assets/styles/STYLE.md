# スタイルガイド

## 設計方針

- **セマンティックなクラス名**：`menu-card`、`modal-header` など、役割が分かる名前を使用
- **Tailwind 非使用**：ユーティリティクラスではなく、従来の CSS で記述
- **共通パターンの集約**：`shared.css` に再利用可能なクラスを定義
- **共通化の優先**：同じスタイルが複数箇所にある場合は、`common.css` または `shared.css` に集約する

---

## ブランドカラー（CSS 変数）

`common.css` の `:root` で定義：

| 変数名 | 値 | 用途 |
|--------|-----|------|
| `--color-main` | #003b82 | メイン色（ヘッダー、ボタン） |
| `--color-sub-blue` | #007cba | サブ色（ホバー、アクセント） |
| `--color-light-blue` | #8ed1fc | フォーカスリング |
| `--color-cream` | #fff5cb | クリーム色 |
| `--color-neutral` | #abb8c3 | ニュートラル（ボーダー等） |
| `--focus-ring` | 0 0 0 2px var(--color-light-blue) | フォーム要素のフォーカスリング |
| `--page-bg-color` | #e2e8f0 | ページ背景（注文一覧・看板編集等） |

---

## 共通クラス（shared.css）

### モーダル

| クラス | 用途 |
|--------|------|
| `.modal` | モーダル全体のラッパー |
| `.modal-overlay` | 背景オーバーレイ |
| `.modal-dialog` | 中央配置用フレックス |
| `.modal-content` | 白背景のコンテンツ枠 |
| `.modal-content--wide` | 幅広（56rem） |
| `.modal-content--narrow` | 幅狭（32rem） |
| `.modal-header` | 青ヘッダー |
| `.modal-header-title` | ヘッダー内タイトル |
| `.modal-body` | 本文エリア |
| `.modal-body--scroll` | スクロール可能（高さ制限） |
| `.modal-footer` | フッター（ボタン配置） |
| `.modal-footer--end` | フッター右寄せ |
| `.modal-footer--gap` | フッター内 gap |
| `.form-dialog` | 確認ダイアログ（登録確認・更新確認等） |
| `.form-dialog-header` | ダイアログヘッダー（コンパクトな余白） |
| `.form-dialog-footer` | ダイアログフッター |

### カード

| クラス | 用途 |
|--------|------|
| `.card` | 白背景・角丸・シャドウのカード |
| `.card-header` | 青ヘッダー |
| `.card-header-title` | ヘッダー内タイトル |
| `.card-body` | 本文エリア |
| `.card-footer` | フッター |
| `.card-header-full` | ヘッダーが端まで続く青カード |
| `.page-card-header` | 機能タイトルヘッダ（注文一覧・注文新規・看板編集・メニュー等で共通） |

### ボタン

| クラス | 用途 |
|--------|------|
| `.btn` | ベース（flex、padding、角丸） |
| `.btn-primary` | メイン色ボタン |
| `.btn-small.btn-primary` | 小さいメイン色ボタン（影付き。全画面編集・出力等で使用） |
| `.btn-action` | メインアクション（登録・更新等。OrderMain・OrderDetail で共用） |
| `.btn-back` | 戻るボタン（グレー背景。看板編集リンクも同スタイル） |
| `.btn-secondary` | 白背景・グレーボーダー |
| `.btn-secondary--slate` | スレート系セカンダリ |
| `.btn-icon` | アイコンボタン（正方形） |
| `.btn-icon--select` | 選択用アイコンボタン |
| `.btn-icon--search` | 検索用アイコンボタン |

### データテーブル

| クラス | 用途 |
|--------|------|
| `.data-table` | テーブル全体 |
| `.data-table-header` | ヘッダー行（グレー背景） |
| `.data-table-row` | データ行（ホバー時ハイライト） |
| `.data-table-cell-primary` | メインのセルテキスト |
| `.data-table-cell-secondary` | サブのセルテキスト |

### ページ・レイアウト

| クラス | 用途 |
|--------|------|
| `.page` | ページ全体（min-height: 100vh、flex column） |
| `.page-content` | メインコンテンツ（flex: 1） |
| `.page-container` | 中央寄せ・max-width 72rem（注文一覧・注文新規・看板編集で共用） |
| `.page-container--narrow` | 幅狭（64rem） |
| `.page-container--form` | フォーム用（80rem） |
| `.page-bg-slate` | ページ背景（common.css。薄いグレー、注文一覧・看板編集で使用） |
| `.card-shadow` | カード用シャドウ（common.css。白カードに class で付与） |
| `.form-actions` | フォームアクション（戻る・登録ボタン配置。OrderMain・OrderDetail で共用） |
| `.form-actions-left` / `-center` / `-right` | 3カラムレイアウト |
| `.template-preview` | テンプレート・地図プレビュー枠（OrderMain・OrderDetail で共用） |

### セクション・フォーム

| クラス | 用途 |
|--------|------|
| `.section-title` | セクション見出し（青・アクセント付き） |
| `.section-title-accent` | 見出し左の縦線 |
| `.section-title-text` | 見出しテキスト |
| `.form-field` | フォームフィールド（ラベル+入力） |
| `.form-label` | フォームラベル（注文一覧・注文入力・看板編集等で共通） |
| `.form-label--with-badge` | 必須バッジ等を横並びにするラベル |
| `.detail-toggle-btn` | 詳細トグルボタン（看板編集・注文一覧で共通） |
| `.detail-toggle-btn-icon` | トグルアイコン（展開時 rotate 180deg） |
| `.form-input` | テキスト入力 |
| `.form-input--readonly` | 読み取り専用 |
| `.form-input--disabled` | 無効 |
| `.form-select` | セレクトボックス |
| `.form-required-badge` | 必須バッジ |

### その他

| クラス | 用途 |
|--------|------|
| `.text-muted` | グレーテキスト |
| `.text-main` | メイン色テキスト |
| `.text-mono` | 等幅フォント |
| `.bg-main` | メイン色背景 |
| `.bg-sub-blue` | サブ色背景 |
| `.line-clamp-2` | 2行で省略 |
| `.truncate` | 1行で省略 |
| `.template-select-item` | テンプレート選択カード |
| `.html-object-value-item` | HTMLオブジェクト値選択アイテム |
| `.sort-btn` | ソートボタン |

### レイアウト互換クラス

OrderMain / OrderDetail 向けに、Tailwind 削除後のフォールバックとして `.flex`、`.gap-2`、`.space-y-4` などのユーティリティクラスを `shared.css` 末尾に定義しています。新規コンポーネントでは、可能な限りセマンティックなクラスを優先してください。

---

## コンポーネント固有スタイル

各 Vue コンポーネントでは `<style scoped>` を使用し、コンポーネント専用のクラス名（例：`menu-card`、`order-list-search-card`）でスタイルを定義します。
