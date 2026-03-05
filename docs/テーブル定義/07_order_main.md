# order_main（注文情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | order_main |
| 論理名 | 注文情報 |

**画面・APIでの扱い**: 注文フォームでは**顧客**（customer）を選択する。一覧・検索・1件取得の表示も顧客名（customer_name）を返す。登録時は customerId を送信し、customer の company_id が order_main.company_id に設定される。**納期**（deadline_dt）・**校正予定日**（proofreading_dt）は注文（新規・変更）画面で日付ピッカー（Y/m/d）で入力する。GET /orders/by-no では `deadlineDt`・`proofreadingDt` を Y/m/d 文字列で返す。POST /orders では任意で `deadlineDt`・`proofreadingDt`（YYYY-MM-DD）を受け取り格納する。

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
| 9 | deadline_dt | 納期 | DATETIME | - | - | - | - | - | - | 注文フォームで入力・API で取得・登録 |
| 10 | proofreading_dt | 校正予定日 | DATETIME | - | - | - | - | - | - | 注文フォームで入力・API で取得・登録 |
| 11 | attribute_01 | 属性01 | VARCHAR | 256 | - | - | - | - | - | 社内CD |
| 12 | attribute_02 | 属性02 | VARCHAR | 256 | - | - | - | - | - | 事業所CD |
| 13 | attribute_03 | 属性03 | VARCHAR | 256 | - | - | - | - | - | 現場CD |
| 14 | attribute_04 | 属性04 | VARCHAR | 256 | - | - | - | - | - | 制作区分（注文品・試作品・サンプル品。将来マスタ化予定、今回は固定値） |
| 15 | attribute_05 | 属性05 | VARCHAR | 256 | - | - | - | - | - | ステータス（依頼中・製作中・確認中・確認完了・製作完了・納品完了・キャンセル。将来マスタ化予定、今回は固定値） |
| 16 | attribute_06 | 属性06 | VARCHAR | 256 | - | - | - | - | - | |
| 17 | attribute_07 | 属性07 | VARCHAR | 256 | - | - | - | - | - | |
| 18 | attribute_08 | 属性08 | VARCHAR | 256 | - | - | - | - | - | |
| 19 | attribute_09 | 属性09 | VARCHAR | 256 | - | - | - | - | - | |
| 20 | attribute_10 | 属性10 | VARCHAR | 256 | - | - | - | - | - | |
| 21 | note | 備考 | TEXT | - | - | - | - | - | - | 複数行可 |
| 22 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 23 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 24 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 25 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 26 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |
