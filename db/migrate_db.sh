#!/bin/bash
# DB名変更時のデータ移行スクリプト
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
docker exec "$CONTAINER" mysql -u"$USER" -p"$PASS" -e "USE \`$SOURCE_DB\`;" 2>/dev/null || { echo "移行元DB '$SOURCE_DB' が存在しません"; exit 1; }
docker exec "$CONTAINER" mysqldump -u"$USER" -p"$PASS" --single-transaction --routines --triggers "$SOURCE_DB" \
  | docker exec -i "$CONTAINER" mysql -u"$USER" -p"$PASS" "$TARGET_DB"
echo "完了: $TARGET_DB にデータを投入しました"
