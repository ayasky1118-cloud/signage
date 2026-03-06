# customer（顧客情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | customer |
| 論理名 | 顧客情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | customer_id | 顧客ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | company_id | 所属会社ID | BIGINT | - | ◯ | - | ◯ | - | - | 会社情報.会社ID |
| 3 | customer_name | 顧客名 | VARCHAR | 256 | ◯ | - | - | - | - | |
| 4 | customer_post | 郵便番号 | VARCHAR | 7 | - | - | - | - | - | |
| 5 | customer_add | 住所 | VARCHAR | 256 | - | - | - | - | - | |
| 6 | customer_tel | 電話番号 | VARCHAR | 20 | - | - | - | - | - | |
| 7 | customer_fax | FAX番号 | VARCHAR | 20 | - | - | - | - | - | |
| 8 | contact_name | 担当者 | VARCHAR | 100 | - | - | - | - | - | |
| 9 | contact_email | 担当者メールアドレス | VARCHAR | 256 | - | - | - | - | - | |
| 10 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 11 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 12 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 13 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 14 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
