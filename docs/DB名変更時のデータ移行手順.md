# DB名変更時のデータ移行手順

移行元のデータベースから移行先のデータベースへ、データを一括で移行する手順です。
（例: `map_db` → `signage_dev` のほか、任意の DB 名の変更に利用できます。）

---

## 前提

- Docker で MySQL が起動している（`docker compose up -d`）
- **移行元DB** が存在し、データが入っていること
- 移行先の DB 名は事前に決めておく（既存 DB がある場合は上書き・マージされる）

---

## 用語

| 用語 | 説明 |
|------|------|
| **移行元DB名** | データのコピー元となるデータベース名（例: `map_db`） |
| **移行先DB名** | データのコピー先となるデータベース名（例: `signage_dev`） |

手順内の `移行元DB名` / `移行先DB名` は、実際の名前に置き換えて実行してください。

---

## 方法1: スクリプトで一括実行（推奨）

移行元・移行先を引数で受け取るスクリプトの例です。`db/` に保存して実行します。

**スクリプト例（`db/migrate_db.sh`）**

```bash
#!/bin/bash
# 使い方: ./db/migrate_db.sh 移行元DB名 移行先DB名
# 例:     ./db/migrate_db.sh map_db signage_dev

SOURCE_DB="${1:?第1引数に移行元DB名を指定してください}"
TARGET_DB="${2:?第2引数に移行先DB名を指定してください}"
CONTAINER="${MYSQL_CONTAINER:-signage-db}"
USER="root"
PASS="password"

set -e
echo "移行元: $SOURCE_DB → 移行先: $TARGET_DB"

docker exec "$CONTAINER" mysql -u"$USER" -p"$PASS" -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
docker exec "$CONTAINER" mysql -u"$USER" -p"$PASS" -e "USE $SOURCE_DB;" 2>/dev/null || { echo "移行元DB '$SOURCE_DB' が存在しません"; exit 1; }
docker exec "$CONTAINER" mysqldump -u"$USER" -p"$PASS" --single-transaction --routines --triggers "$SOURCE_DB" \
  | docker exec -i "$CONTAINER" mysql -u"$USER" -p"$PASS" "$TARGET_DB"
echo "完了: $TARGET_DB にデータを投入しました"
```

**実行例**

```bash
cd /path/to/signage
chmod +x db/migrate_db.sh
./db/migrate_db.sh map_db signage_dev
```

コンテナ名が異なる場合は環境変数で指定できます。

```bash
MYSQL_CONTAINER=my-mysql ./db/migrate_db.sh map_db signage_dev
```

---

## 方法2: 手動で実行する場合

### 1. MySQL に接続

```bash
docker exec -it signage-db mysql -uroot -ppassword
```

### 2. 移行先データベースの作成

```sql
-- 移行先DB名 を実際の名前に置き換える
CREATE DATABASE IF NOT EXISTS 移行先DB名 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

例: `signage_dev` を作成する場合

```sql
CREATE DATABASE IF NOT EXISTS signage_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. シェルに戻り、ダンプ＆リストア

```bash
# 移行元DB名・移行先DB名 を実際の名前に置き換える
docker exec signage-db mysqldump -uroot -ppassword --single-transaction --routines --triggers 移行元DB名 \
  | docker exec -i signage-db mysql -uroot -ppassword 移行先DB名
```

例: `map_db` → `signage_dev` の場合

```bash
docker exec signage-db mysqldump -uroot -ppassword --single-transaction --routines --triggers map_db \
  | docker exec -i signage-db mysql -uroot -ppassword signage_dev
```

### 4. 確認（任意）

```bash
docker exec -it signage-db mysql -uroot -ppassword -e "USE 移行先DB名; SHOW TABLES;"
```

---

## 移行後の確認

- `backend/.env` の `DATABASE_URL` が移行先DB名を指していること
  （例: `.../signage_dev?charset=utf8mb4`）
- バックエンドを再起動し、`GET /companies` などでデータが返ることを確認

---

## 注意

- **移行元の DB は削除されません。** 不要になったら手動で `DROP DATABASE 移行元DB名;` を実行できます。
- 移行先に既存の DB がある場合、ダンプの内容で**上書き・マージ**されます（同じテーブルはダンプで置き換えられます）。必要なデータは事前にバックアップしてください。
