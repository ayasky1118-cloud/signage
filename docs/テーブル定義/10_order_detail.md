# order_detail（注文詳細情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | order_detail |
| 論理名 | 注文詳細情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | order_detail_id | 注文詳細ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | order_id | 受注ID | BIGINT | - | ◯ | - | ◯ | ◯ | - | 注文情報.受注ID |
| 3 | branch_no | 枝番 | VARCHAR | 2 | ◯ | - | - | ◯ | - | (order_id, branch_no)でUK |
| 4 | design_data | デザイン編集データ | JSON | - | - | - | - | - | - | 地図のルート・テキスト・画像・吹き出し等。地図出力/読込は JSON ファイルで行う |
| 5 | last_export_type | 最終出力種別 | VARCHAR | 50 | - | - | - | - | - | 出力種別（JPEG・SVG） |
| 6 | last_export_dt | 最終出力日時 | DATETIME | - | - | - | - | - | - | |
| 7 | last_export_by | 最終出力者 | BIGINT | - | - | - | - | - | - | |
| 8 | last_export_key | 保存先キー | TEXT | - | - | - | - | - | - | |
| 9 | note | 備考 | TEXT | - | - | - | - | - | - | 枝番毎。order_main.note と同様（任意） |
| 10 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 11 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 12 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 13 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 14 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
