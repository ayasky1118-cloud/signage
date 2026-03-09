#!/bin/bash
# AWS RDS → ローカル Docker MySQL へのデータ復元スクリプト
#
# 用途: ローカル DB が壊れた場合、RDS から最新データを復元する
# 前提: 事前に migrate-to-rds.sh でローカル→RDS に移行済みであること
#
# 使い方:
#   RDS_HOST=xxx RDS_USER=admin RDS_PASSWORD=xxx ./scripts/migrate-from-rds.sh [復元先DB名]
#
# 例:
#   RDS_HOST=signage-dev-db.xxx.ap-northeast-1.rds.amazonaws.com \
#   RDS_USER=admin RDS_PASSWORD=yourpassword \
#   ./scripts/migrate-from-rds.sh signage_dev

TARGET_DB="${1:-signage_dev}"
CONTAINER="${MYSQL_CONTAINER:-signage-db}"
LOCAL_USER="root"
LOCAL_PASS="password"
SOURCE_DB="${RDS_DATABASE:-signage_dev}"

set -e

if [ -z "$RDS_HOST" ] || [ -z "$RDS_USER" ] || [ -z "$RDS_PASSWORD" ]; then
  echo "エラー: 以下の環境変数を設定してください"
  echo "  RDS_HOST     - RDS インスタンスのエンドポイント（RDS Proxy は不可）"
  echo "  RDS_USER     - RDS のユーザー名"
  echo "  RDS_PASSWORD - RDS のパスワード"
  echo ""
  echo "例:"
  echo "  RDS_HOST=signage-dev-db.xxx.ap-northeast-1.rds.amazonaws.com \\"
  echo "  RDS_USER=admin RDS_PASSWORD=yourpassword \\"
  echo "  ./scripts/migrate-from-rds.sh signage_dev"
  exit 1
fi

echo "=== データ復元: RDS → ローカル ==="
echo "移行元: $SOURCE_DB @ $RDS_HOST"
echo "移行先: $TARGET_DB (Docker: $CONTAINER)"
echo ""
echo "警告: ローカルの既存データは上書きされます。"
read -p "続行しますか? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "中止しました。"
  exit 0
fi

# ローカルコンテナの確認
docker exec "$CONTAINER" mysql -u"$LOCAL_USER" -p"$LOCAL_PASS" -e "SELECT 1;" 2>/dev/null \
  || { echo "エラー: コンテナ $CONTAINER が起動していません。docker compose up -d を実行してください"; exit 1; }

# mysql / mysqldump クライアントの確認
if ! command -v mysql &>/dev/null || ! command -v mysqldump &>/dev/null; then
  echo "エラー: mysql および mysqldump が必要です。brew install mysql-client でインストールしてください"
  exit 1
fi

# RDS への接続確認
echo "RDS への接続確認..."
mysql -h"$RDS_HOST" -u"$RDS_USER" -p"$RDS_PASSWORD" --ssl-mode=REQUIRED -e "USE \`$SOURCE_DB\`;" 2>/dev/null \
  || { echo "RDS に接続できません。接続情報とセキュリティグループ（3306）を確認してください"; exit 1; }

echo ""
# 復元先 DB の作成（存在しない場合）
docker exec "$CONTAINER" mysql -u"$LOCAL_USER" -p"$LOCAL_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

echo "=== ダンプ取得（RDS）==="
mysqldump -h"$RDS_HOST" -u"$RDS_USER" -p"$RDS_PASSWORD" --ssl-mode=REQUIRED \
  --single-transaction --set-gtid-purged=OFF --routines --triggers --no-create-db \
  "$SOURCE_DB" > /tmp/signage_restore_dump.sql

echo "=== リストア（ローカル）==="
docker exec -i "$CONTAINER" mysql -u"$LOCAL_USER" -p"$LOCAL_PASS" --default-character-set=utf8mb4 "$TARGET_DB" < /tmp/signage_restore_dump.sql

rm -f /tmp/signage_restore_dump.sql

echo ""
echo "=== 完了 ==="
echo "ローカル $TARGET_DB に RDS のデータを復元しました。"
