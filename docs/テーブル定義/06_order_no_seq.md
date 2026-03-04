# order_no_seq（注文番号採番管理情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | order_no_seq |
| 論理名 | 注文番号採番管理情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | company_id | 所属会社ID | BIGINT | - | ◯ | ◯ | ◯ | - | - | 会社情報.会社ID |
| 2 | year | 年 | SMALLINT UNSIGNED | - | ◯ | ◯ | - | - | - | |
| 3 | last_number | 最終連番 | INT UNSIGNED | - | ◯ | ◯ | - | - | - | |
| 4 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 5 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 6 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 7 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 8 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
