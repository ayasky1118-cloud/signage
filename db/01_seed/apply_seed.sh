#!/usr/bin/env bash
# html_object / html_object_value のテストデータのみ投入（既存データを削除して再投入）
# テーブルが存在する前提。スキーマ全体を適用する場合は ../apply_schema.sh を使用
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$ROOT_DIR"

if ! docker ps --format '{{.Names}}' | grep -q '^signage-db$'; then
  echo "エラー: コンテナ signage-db が起動していません。"
  echo "  cd $ROOT_DIR && docker compose up -d"
  exit 1
fi

echo "適用: db/01_seed/010_html_object_seed.sql"
docker exec -i signage-db mysql -uroot -ppassword --default-character-set=utf8mb4 signage_dev < db/01_seed/010_html_object_seed.sql

echo "完了: html_object テストデータを投入しました。"
