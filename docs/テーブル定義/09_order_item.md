# order_item（注文項目情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | order_item |
| 論理名 | 注文項目情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | order_item_id | 注文項目ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | order_id | 受注ID | BIGINT | - | ◯ | - | ◯ | - | - | 注文情報.受注ID |
| 3 | template_item_id | テンプレート項目ID | BIGINT | - | ◯ | - | ◯ | - | - | テンプレート項目情報.テンプレート項目ID |
| 4 | order_item_val | 注文項目値 | VARCHAR | 200 | - | - | - | - | - | |
| 5 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 6 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 7 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 8 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 9 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |

## 制約（DDL準拠）

- **UK**: (order_id, template_item_id)
