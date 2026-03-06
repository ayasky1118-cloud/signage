# company（会社情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | company |
| 論理名 | 会社情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | company_id | 会社ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | company_code | 会社コード | VARCHAR | 50 | ◯ | - | - | - | - | 必要か？ |
| 3 | company_name | 会社名 | VARCHAR | 256 | ◯ | - | - | - | - | |
| 4 | company_post | 郵便番号 | VARCHAR | 7 | - | - | - | - | - | |
| 5 | company_add | 住所 | VARCHAR | 256 | - | - | - | - | - | |
| 6 | company_tel | 電話番号 | VARCHAR | 20 | - | - | - | - | - | |
| 7 | company_fax | FAX番号 | VARCHAR | 20 | - | - | - | - | - | |
| 8 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 9 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 10 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 11 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 12 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
