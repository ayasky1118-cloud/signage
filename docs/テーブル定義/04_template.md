# template（テンプレート情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | template |
| 論理名 | テンプレート情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | template_id | テンプレートID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | company_id | 会社ID | BIGINT | - | ◯ | - | ◯ | - | - | 会社情報.会社ID |
| 3 | customer_id | 顧客ID | BIGINT | - | ◯ | - | ◯ | - | - | 顧客情報.顧客ID |
| 4 | template_name | テンプレート名 | VARCHAR | 100 | ◯ | - | - | - | - | |
| 5 | template_data | テンプレートデータ | TEXT | - | - | - | - | - | - | 保存先キー |
| 6 | display_order | 表示順 | INTEGER | - | ◯ | - | - | - | - | |
| 7 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 8 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 9 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 10 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 11 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
