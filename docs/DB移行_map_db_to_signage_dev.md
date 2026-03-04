# map_db → signage_dev データ移行手順

DB名を `signage_dev` に統一し、既存の `map_db` のデータを移行する手順です。

---

## 前提

- Docker で MySQL が起動している（`docker compose up -d`）
- 移行元の **map_db** が存在すること（既にデータが入っている状態）

---

## 方法1: スクリプトで一括実行（推奨）

signage プロジェクトルートで実行します。

```bash
cd /path/to/signage
chmod +x db/migrate_map_db_to_signage_dev.sh
./db/migrate_map_db_to_signage_dev.sh
```

スクリプトの処理内容:

1. `CREATE DATABASE IF NOT EXISTS signage_dev` で DB 作成
2. 移行元 `map_db` の存在確認
3. `mysqldump` で `map_db` をダンプし、`signage_dev` に投入

---

## 方法2: 手動で実行する場合

### 1. MySQL に接続

```bash
docker exec -it signage-db mysql -uroot -ppassword
```

### 2. データベース作成

```sql
CREATE DATABASE IF NOT EXISTS signage_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. シェルに戻り、ダンプ＆リストア

```bash
# map_db をダンプして signage_dev に投入
docker exec signage-db mysqldump -uroot -ppassword --single-transaction --routines --triggers map_db \
  | docker exec -i signage-db mysql -uroot -ppassword signage_dev
```

### 4. 確認（任意）

```bash
docker exec -it signage-db mysql -uroot -ppassword -e "USE signage_dev; SHOW TABLES;"
```

---

## 移行後の確認

- `signage/backend/.env` の `DATABASE_URL` が `.../signage_dev?charset=utf8mb4` になっていること
- バックエンド起動後、`GET /companies` などでデータが返ることを確認

---

## 注意

- **移行元の map_db は削除されません。** 不要になったら手動で `DROP DATABASE map_db;` を実行できます。
- コンテナを初回から `MYSQL_DATABASE: signage_dev` で起動している場合、`signage_dev` は既に存在します。その状態で上記スクリプトを実行すると、`map_db` の内容が `signage_dev` に上書き・マージされます（同じテーブルはダンプで置き換えられます）。
