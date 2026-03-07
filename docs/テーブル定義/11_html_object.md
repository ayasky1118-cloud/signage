# html_object（HTMLオブジェクト）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | html_object |
| 論理名 | HTMLオブジェクト（全社共通マスタ） |

ルート描画・テキスト配置・画像配置・吹き出し配置など、看板編集で利用するHTMLオブジェクトの区分を管理する。ログイン会社に依存しない全社共通マスタ。

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | html_object_id | HTMLオブジェクトID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | category_code | 区分コード | VARCHAR | 50 | ◯ | - | - | ◯ | - | ROUTE_DRAWING/TEXT_PLACEMENT/IMAGE_PLACEMENT/BALLOON_PLACEMENT等 |
| 3 | category_name | 区分名（表示用） | VARCHAR | 100 | ◯ | - | - | - | - | |
| 4 | html_object_type | HTMLオブジェクト種別 | VARCHAR | 50 | ◯ | - | - | - | - | DROPDOWN/TEXT/IMAGE/BALLOON等 |
| 5 | has_child_table | 子テーブル有無フラグ | BOOLEAN | - | ◯ | - | - | - | TRUE | true=値マスタあり、false=吹き出しモード等で値マスタなし |
| 6 | display_order | 表示順 | INT | - | ◯ | - | - | - | 0 | |
| 7 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 8 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 9 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | 0 | 全社共通のためシステム値 |
| 10 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 11 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | 0 | 全社共通のためシステム値 |

## 制約

- **PK**: html_object_id
- **UK**: category_code … 区分コードの重複不可
