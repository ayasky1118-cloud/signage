#!/bin/bash
# Amplify への手動デプロイスクリプト
# GitLab CI の Runner が利用できない場合に使用
#
# 前提: AWS CLI が設定済み（aws configure または環境変数）
# 実行: ./scripts/deploy-amplify.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
AMPLIFY_APP_ID="d27nzen1vhtcee"
BRANCH_NAME="main"
REGION="ap-northeast-1"

cd "$PROJECT_ROOT"

echo "=== 1. フロントエンドをビルド ==="
cd "$FRONTEND_DIR"
# 環境変数 DEPLOY_ENV で切り替え（未指定時は staging = 現在構築済みの AWS）
# staging / production のいずれか。.env.staging / .env.production を読み込む
DEPLOY_ENV="${DEPLOY_ENV:-staging}"
if [[ "$DEPLOY_ENV" != "staging" && "$DEPLOY_ENV" != "production" ]]; then
  echo "Error: DEPLOY_ENV must be 'staging' or 'production' (got: $DEPLOY_ENV)"
  exit 1
fi
npm ci
npm run build:${DEPLOY_ENV}

echo ""
echo "=== 2. デプロイ用 ZIP を作成 ==="
cd dist
zip -r ../build.zip .
cd ..

echo ""
echo "=== 3. Amplify にデプロイ ==="
DEPLOY_INFO=$(aws amplify create-deployment \
  --app-id "$AMPLIFY_APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --region "$REGION" \
  --output json)

UPLOAD_URL=$(echo "$DEPLOY_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['zipUploadUrl'])")
JOB_ID=$(echo "$DEPLOY_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['jobId'])")

curl -X PUT --upload-file build.zip "$UPLOAD_URL"

aws amplify start-deployment \
  --app-id "$AMPLIFY_APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --job-id "$JOB_ID" \
  --region "$REGION"

rm -f build.zip

echo ""
echo "=== デプロイ開始しました ==="
echo "Amplify コンソールで進行状況を確認してください:"
echo "https://ap-northeast-1.console.aws.amazon.com/amplify/home?region=$REGION#/$AMPLIFY_APP_ID/$BRANCH_NAME"
