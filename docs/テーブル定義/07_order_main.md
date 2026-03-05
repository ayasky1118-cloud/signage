# order_main（注文情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | order_main |
| 論理名 | 注文情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | order_id | 受注ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | company_id | 会社ID | BIGINT | - | ◯ | - | ◯ | - | - | 会社情報.会社ID |
| 3 | customer_id | 顧客ID | BIGINT | - | ◯ | - | ◯ | - | - | 顧客情報.顧客ID |
| 4 | template_id | テンプレートID | BIGINT | - | ◯ | - | ◯ | - | - | テンプレート.テンプレートID |
| 5 | order_no | 受注番号 | VARCHAR | 30 | ◯ | - | - | ◯ | - | order_no_seqで管理 |
| 6 | order_name | 受注名 | VARCHAR | 256 | ◯ | - | - | - | - | |
| 7 | order_add | 受注住所 | VARCHAR | 256 | ◯ | - | - | - | - | |
| 8 | design_type_id | デザイン種別ID | BIGINT | - | ◯ | - | ◯ | - | - | デザイン種別マスタ.デザイン種別ID |
| 9 | attribute_01 | 属性01 | VARCHAR | 256 | - | - | - | - | - | 社内CD |
| 10 | attribute_02 | 属性02 | VARCHAR | 256 | - | - | - | - | - | 事業所CD |
| 11 | attribute_03 | 属性03 | VARCHAR | 256 | - | - | - | - | - | 現場CD |
| 12 | attribute_04 | 属性04 | VARCHAR | 256 | - | - | - | - | - | |
| 13 | attribute_05 | 属性05 | VARCHAR | 256 | - | - | - | - | - | |
| 14 | attribute_06 | 属性06 | VARCHAR | 256 | - | - | - | - | - | |
| 15 | attribute_07 | 属性07 | VARCHAR | 256 | - | - | - | - | - | |
| 16 | attribute_08 | 属性08 | VARCHAR | 256 | - | - | - | - | - | |
| 17 | attribute_09 | 属性09 | VARCHAR | 256 | - | - | - | - | - | |
| 18 | attribute_10 | 属性10 | VARCHAR | 256 | - | - | - | - | - | |
| 19 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 20 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 21 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 22 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 23 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
