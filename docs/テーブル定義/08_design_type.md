# design_type（デザイン種別マスタ）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | design_type |
| 論理名 | デザイン種別マスタ |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | design_type_id | デザイン種別ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | company_id | 会社ID | BIGINT | - | ◯ | - | ◯ | - | - | 会社情報.会社ID |
| 3 | design_type_name | デザイン種別名 | VARCHAR | 50 | ◯ | - | - | - | - | 同一会社内でユニーク(UK) |
| 4 | display_order | 表示順 | INT | - | ◯ | - | - | - | 0 | |
| 5 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 6 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 7 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 8 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 9 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |

## 制約

- **PK**: design_type_id
- **UK**: (company_id, design_type_name) … 同一会社内でデザイン種別名の重複不可
- **FK**: company_id → company(company_id)
