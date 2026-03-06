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
| 4 | design_data | デザイン編集データ | JSON | - | - | - | - | - | - | |
| 5 | last_export_type | 最終出力種別 | VARCHAR | 50 | - | - | - | - | - | 出力種別（JPEG・SVG） |
| 6 | last_export_dt | 最終出力日時 | DATETIME | - | - | - | - | - | - | |
| 7 | last_export_by | 最終出力者 | BIGINT | - | - | - | - | - | - | |
| 8 | last_export_key | 保存先キー | TEXT | - | - | - | - | - | - | |
| 9 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 10 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 11 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 12 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 13 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
