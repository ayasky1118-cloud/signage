#!/usr/bin/env bash
# signage_dev を mysqldump でバックアップする。
# 出力: db/backups/signage_dev_YYYYMMDD_HHMMSS.sql
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$SCRIPT_DIR/backups"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/signage_dev_${STAMP}.sql"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q '^signage-db$'; then
  echo "エラー: コンテナ signage-db が起動していません。"
  exit 1
fi

echo "バックアップ中: $OUT"
docker exec signage-db mysqldump -uroot -ppassword --single-transaction --routines --triggers signage_dev > "$OUT"
echo "完了: $(wc -l < "$OUT") 行"
