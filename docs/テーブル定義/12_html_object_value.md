# html_object_value（HTMLオブジェクト値）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | html_object_value |
| 論理名 | HTMLオブジェクト値（全社共通マスタ） |

html_object に紐づく値（ルート描画なら赤・実線、青・破線など、画像配置なら信号機・学校・警察・役所など）を管理する。ログイン会社に依存しない全社共通マスタ。吹き出しモード（has_child_table=false）の区分は当テーブルにレコードを持たない。

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | html_object_value_id | HTMLオブジェクト値ID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | html_object_id | HTMLオブジェクトID | BIGINT | - | ◯ | - | ◯ | - | - | html_object.html_object_id |
| 3 | value_code | 値コード | VARCHAR | 50 | ◯ | - | - | - | - | ルート描画: RED_SOLID/BLUE_DASHED等。画像配置: TRAFFIC_LIGHT/SCHOOL/POLICE/GOVERNMENT等。同一html_object内でユニーク(UK) |
| 4 | value_name | 値の表示名 | VARCHAR | 100 | ◯ | - | - | - | - | ルート描画: 赤・実線、青・破線等。画像配置: 信号機、学校、警察、役所等 |
| 5 | value_data | 実際の値 | VARCHAR | 255 | - | - | - | - | - | ルート描画: 色コード・線種（例: #FF0000,solid）。画像配置: 画像形式（例: png） |
| 6 | sample_image_path | サンプル画像パス | VARCHAR | 500 | - | - | - | - | - | プレビュー用。ルート: /samples/route/route_red_solid.png。画像配置: /samples/image/image_traffic_light.png 等 |
| 7 | display_order | 表示順 | INT | - | ◯ | - | - | - | 0 | |
| 8 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 9 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 10 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | 0 | 全社共通のためシステム値 |
| 11 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 12 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | 0 | 全社共通のためシステム値 |

## 制約

- **PK**: html_object_value_id
- **UK**: (html_object_id, value_code) … 同一HTMLオブジェクト内で値コードの重複不可
- **FK**: html_object_id → html_object(html_object_id) ON DELETE CASCADE
