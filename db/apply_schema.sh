#!/usr/bin/env bash
# signage_dev に db/00_schema/ の DDL を番号順に適用する（001〜010。000_drop_all は含めない）
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if ! docker ps --format '{{.Names}}' | grep -q '^signage-db$'; then
  echo "エラー: コンテナ signage-db が起動していません。"
  echo "  cd $ROOT_DIR && docker compose up -d"
  exit 1
fi

for f in db/00_schema/001_company.sql \
         db/00_schema/002_user.sql \
         db/00_schema/003_customer.sql \
         db/00_schema/004_template.sql \
         db/00_schema/005_template_item.sql \
         db/00_schema/006_order_no_seq.sql \
         db/00_schema/007_design_type.sql \
         db/00_schema/008_order_main.sql \
         db/00_schema/009_order_item.sql \
         db/00_schema/010_order_detail.sql \
         db/00_schema/011_html_object.sql \
         db/00_schema/012_html_object_value.sql; do
  echo "適用: $f"
  docker exec -i signage-db mysql -uroot -ppassword --default-character-set=utf8mb4 signage_dev < "$f"
done

echo "適用: db/01_seed/010_html_object_seed.sql"
docker exec -i signage-db mysql -uroot -ppassword --default-character-set=utf8mb4 signage_dev < db/01_seed/010_html_object_seed.sql

echo "完了: テーブルを作成し、テストデータを投入しました。"
