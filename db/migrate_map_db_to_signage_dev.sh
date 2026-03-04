#!/usr/bin/env bash
#
# map_db から signage_dev へデータを移行するスクリプト
#
# 前提:
#   - Docker で MySQL が起動している（docker compose up -d）
#   - コンテナ名: signage-db、ポート: 3307、root パスワード: password
#   - 移行元の map_db が存在すること
#
# 実行: signage プロジェクトルートで
#   ./db/migrate_map_db_to_signage_dev.sh
#

set -e

CONTAINER="${MYSQL_CONTAINER:-signage-db}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-password}"
SOURCE_DB="map_db"
TARGET_DB="signage_dev"

echo "=== map_db → signage_dev データ移行 ==="
echo "コンテナ: $CONTAINER"
echo ""

# 1. コンテナ稼働確認
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "エラー: コンテナ '$CONTAINER' が起動していません。"
  echo "  cd /Users/yoshimi/dev && docker compose up -d"
  exit 1
fi

# 2. signage_dev を作成（既にあればスキップ）
echo "[1/3] CREATE DATABASE $TARGET_DB ..."
docker exec "$CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e \
  "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "  OK"
echo ""

# 3. map_db の存在確認
echo "[2/3] 移行元 $SOURCE_DB の確認..."
if ! docker exec "$CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "USE \`$SOURCE_DB\`;" 2>/dev/null; then
  echo "  $SOURCE_DB が存在しません。"
  echo "  先にコンテナ内で map_db を作成するか、既存ボリュームで map_db がある状態で実行してください。"
  exit 1
fi
echo "  OK"
echo ""

# 4. ダンプして signage_dev に投入
echo "[3/3] $SOURCE_DB をダンプして $TARGET_DB に投入..."
docker exec "$CONTAINER" mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --routines --triggers "$SOURCE_DB" \
  | docker exec -i "$CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$TARGET_DB"
echo "  OK"
echo ""

echo "=== 移行完了 ==="
echo "  $TARGET_DB にデータがコピーされました。"
echo "  アプリの DATABASE_URL が signage_dev を指していることを確認してください。"
