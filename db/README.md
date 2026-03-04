# DB スキーマ・マイグレーション

## DB 変更を反映する手順

定義書（`docs/テーブル定義/`）や DDL（`00_schema/`）を変更したあと、**実際の MySQL に反映する**には次のいずれかを実行してください。

### 方法1: スキーマをまとめて適用

`00_schema/` の 001〜010 を順に実行します。**既存テーブルは CREATE TABLE IF NOT EXISTS のため「そのまま」になり、列の追加・削除は行われません。** 既存の `order_main` にまだ `design_type`（VARCHAR）がある場合は、あとで「方法3」のマイグレーションを実行してください。

```bash
cd /Users/yoshimi/dev/map_pj
PYTHONPATH=backend backend/.venv/bin/python db/apply_schema.py
```

（backend の venv を有効にしている場合は `python db/apply_schema.py` で可。）

- 接続先は **backend/.env の `DATABASE_URL`** です（例: ポート 3307 の場合は `.env` で 3307 を指定）。
- 既存データはそのまま残ります。

### 方法2: 全テーブルを消してから作り直す（データ削除）

開発で「まっさらな状態から作り直したい」場合に使います。**データはすべて削除されます。**

```bash
cd /Users/yoshimi/dev/map_pj
PYTHONPATH=backend backend/.venv/bin/python db/apply_schema.py --reset
```

### 方法3: 受注情報の design_type → design_type_id 移行（データ移行）

**既存の `order_main` に `design_type`（VARCHAR）が残っている場合**は、このマイグレーションで「design_type_id 追加 → マスタに登録 → 既存データ紐づけ → 旧カラム削除」を行います。`apply_schema.py` だけでは既存テーブル構造は変わらないため、受注情報を新スキーマに合わせるにはここを実行してください。

```bash
cd /Users/yoshimi/dev/map_pj
PYTHONPATH=backend backend/.venv/bin/python db/01_migrations/run_migration.py
```

---

## 接続先の確認

- 接続先は **backend/.env** の `DATABASE_URL` です。
- Docker で MySQL を 3307 で動かしている場合は、例:  
  `DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3307/map_db?charset=utf8mb4`
- 接続できるか確認するには:  
  `cd backend && python check_db.py`

## ディレクトリ

| ディレクトリ / ファイル | 説明 |
|------------------------|------|
| `00_schema/` | テーブル作成 DDL（001_company.sql 〜 010_order_detail.sql）。番号順に実行。 |
| `00_schema/000_drop_all.sql` | 開発用：全テーブル削除（apply_schema.py --reset で使用） |
| `01_migrations/` | 既存 DB を変えるマイグレーション（例: order_main の design_type → design_type_id） |
| `apply_schema.py` | 00_schema を順に実行するスクリプト（本 README の手順で使用） |
