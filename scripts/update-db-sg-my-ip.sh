#!/bin/bash
# RDS のセキュリティグループ（signage-db-sg）に、現在の IP から 3306 を許可するルールを追加する。
# DBeaver 接続が「急にできなくなった」場合、IP が変わった可能性が高い。このスクリプトで対応できる。
#
# 使い方: ./scripts/update-db-sg-my-ip.sh

set -e
REGION="ap-northeast-1"
SG_NAME="signage-db-sg"

echo "現在の IPv4 を取得中..."
MY_IP=$(curl -4 -s ifconfig.me 2>/dev/null || curl -s ipv4.icanhazip.com 2>/dev/null)
if [ -z "$MY_IP" ]; then
  echo "エラー: IPv4 を取得できませんでした。"
  exit 1
fi
echo "  現在の IP: $MY_IP"

echo ""
echo "セキュリティグループ ID を取得中..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region "$REGION" 2>/dev/null)
if [ -z "$SG_ID" ] || [ "$SG_ID" = "None" ]; then
  echo "エラー: $SG_NAME が見つかりません。AWS CLI の設定とリージョンを確認してください。"
  exit 1
fi
echo "  SG ID: $SG_ID"

echo ""
echo "インバウンドルールを追加中 (3306 from $MY_IP/32)..."
if aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 3306 \
  --cidr "$MY_IP/32" \
  --region "$REGION" 2>/dev/null; then
  echo ""
  echo "✅ 完了: $MY_IP から 3306 を許可しました。"
  echo "   DBeaver で接続を試してください。"
else
  echo ""
  echo "ℹ️  この IP は既に許可済みの可能性があります。"
  echo "   接続テスト: nc -zv signage-dev-db.cly840668ik8.ap-northeast-1.rds.amazonaws.com 3306"
  echo "   タイムアウトする場合はルートテーブル（NAT→IGW）を確認してください。"
fi
