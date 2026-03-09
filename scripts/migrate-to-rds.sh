#!/bin/bash
# ローカル Docker MySQL → AWS RDS へのデータ移行スクリプト
#
# 前提:
#   - ローカル Docker で MySQL が起動している
#   - RDS にスキーマが投入済み（db/00_schema/ を実行済み）
#   - RDS がローカルから接続可能（SG でマイ IP 許可済み）
#
# 使い方:
#   RDS_HOST=xxx RDS_USER=admin RDS_PASSWORD=xxx ./scripts/migrate-to-rds.sh [移行元DB名]
#
# 例（RDS インスタンスのエンドポイント。RDS Proxy はローカルから接続不可）:
#   RDS_HOST=signage-dev-db.xxx.ap-northeast-1.rds.amazonaws.com \
#   RDS_USER=admin RDS_PASSWORD=yourpassword \
#   ./scripts/migrate-to-rds.sh signage_dev

SOURCE_DB="${1:-signage_dev}"
CONTAINER="${MYSQL_CONTAINER:-signage-db}"
LOCAL_USER="root"
LOCAL_PASS="password"
TARGET_DB="${RDS_DATABASE:-signage_dev}"

set -e

if [ -z "$RDS_HOST" ] || [ -z "$RDS_USER" ] || [ -z "$RDS_PASSWORD" ]; then
  echo "エラー: 以下の環境変数を設定してください"
  echo "  RDS_HOST     - RDS または RDS Proxy のエンドポイント"
  echo "  RDS_USER     - RDS のユーザー名"
  echo "  RDS_PASSWORD - RDS のパスワード"
  echo ""
  echo "例:"
  echo "  RDS_HOST=signage-dev-db.xxx.ap-northeast-1.rds.amazonaws.com \\"
  echo "  RDS_USER=admin RDS_PASSWORD=yourpassword \\"
  echo "  ./scripts/migrate-to-rds.sh signage_dev"
  exit 1
fi

echo "=== データ移行: ローカル → RDS ==="
echo "移行元: $SOURCE_DB (Docker: $CONTAINER)"
echo "移行先: $TARGET_DB @ $RDS_HOST"
echo ""

# 移行元の存在確認
docker exec "$CONTAINER" mysql -u"$LOCAL_USER" -p"$LOCAL_PASS" -e "USE \`$SOURCE_DB\`;" 2>/dev/null \
  || { echo "移行元DB '$SOURCE_DB' が存在しません"; exit 1; }

# mysql クライアントの確認
if ! command -v mysql &>/dev/null; then
  echo "エラー: mysql クライアントが必要です。brew install mysql-client でインストールしてください"
  exit 1
fi

# 移行先 RDS への接続確認と DB 作成（RDS は caching_sha2_password のため --ssl-mode=REQUIRED が必要）
echo "移行先 RDS への接続確認..."
mysql -h"$RDS_HOST" -u"$RDS_USER" -p"$RDS_PASSWORD" --ssl-mode=REQUIRED -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null \
  || { echo "RDS に接続できません。接続情報とセキュリティグループ（3306）を確認してください"; exit 1; }

echo ""
echo "=== ダンプ取得（ローカル）==="
docker exec "$CONTAINER" mysqldump -u"$LOCAL_USER" -p"$LOCAL_PASS" \
  --single-transaction --routines --triggers --no-create-db \
  "$SOURCE_DB" > /tmp/signage_migrate_dump.sql

echo "=== リストア（RDS）==="
mysql -h"$RDS_HOST" -u"$RDS_USER" -p"$RDS_PASSWORD" --ssl-mode=REQUIRED "$TARGET_DB" < /tmp/signage_migrate_dump.sql

rm -f /tmp/signage_migrate_dump.sql

echo ""
echo "=== 完了 ==="
echo "$TARGET_DB にデータを投入しました。"
echo "Amplify から https://main.d27nzen1vhtcee.amplifyapp.com で動作確認してください。"
