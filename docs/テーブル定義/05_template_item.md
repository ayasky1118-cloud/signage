# template_item（テンプレート項目情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | template_item |
| 論理名 | テンプレート項目情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | template_item_id | テンプレート項目ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | template_id | テンプレートID | BIGINT | - | ◯ | - | ◯ | - | - | テンプレート情報.テンプレートID |
| 3 | item_name | 項目名 | VARCHAR | 256 | ◯ | - | - | - | - | |
| 4 | item_type | 項目種別 | VARCHAR | 50 | ◯ | - | - | - | - | text/number/select/...（運用で固定） |
| 5 | is_required | 必須フラグ | BOOLEAN | - | ◯ | - | - | - | - | |
| 6 | display_order | 表示順 | INTEGER | - | ◯ | - | - | - | - | |
| 7 | item_color | 色 | VARCHAR | - | - | - | - | - | - | |
| 8 | item_font | フォントサイズ | TINYINT | - | - | - | - | - | - | |
| 9 | item_max_char | 最大文字数 | TINYINT | - | - | - | - | - | - | |
| 10 | item_align | 揃え | VARCHAR | 1 | - | - | - | - | - | L:左 C:中央 R:右 |
| 11 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 12 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 13 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 14 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 15 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
