#!/bin/bash
# CGS 環境用 Cognito User Pool 作成スクリプト
#
# 前提: AWS CLI が設定済み（CGS 環境のアカウント・リージョン）
# 実行: ./scripts/create-cognito-user-pool.sh
#
# 作成後、出力された User Pool ID と Client ID を
# frontend/.env または .env.staging に設定すること。

set -e

REGION="${AWS_REGION:-ap-northeast-1}"
POOL_NAME="signage-cgs-pool"
CLIENT_NAME="signage-web"

echo "=== CGS 環境用 Cognito User Pool 作成 ==="
echo "リージョン: $REGION"
echo ""

# 1. User Pool 作成
echo "1. User Pool を作成中..."
POOL_OUTPUT=$(aws cognito-idp create-user-pool \
  --pool-name "$POOL_NAME" \
  --username-attributes email \
  --auto-verified-attributes email \
  --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=false,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
  --region "$REGION" \
  --output json)

USER_POOL_ID=$(echo "$POOL_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['UserPool']['Id'])")
echo "   User Pool ID: $USER_POOL_ID"
echo ""

# 2. App Client 作成（パブリッククライアント、シークレットなし）
echo "2. アプリクライアントを作成中..."
CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-name "$CLIENT_NAME" \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region "$REGION" \
  --output json)

CLIENT_ID=$(echo "$CLIENT_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['UserPoolClient']['ClientId'])")
echo "   Client ID: $CLIENT_ID"
echo ""

echo "=== 作成完了 ==="
echo ""
echo "以下を frontend/.env または frontend/.env.staging に設定してください:"
echo ""
echo "VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "VITE_COGNITO_USER_POOL_CLIENT_ID=$CLIENT_ID"
echo ""
echo "01.現行構成リファレンス.md の Cognito セクションにも記載してください。"
