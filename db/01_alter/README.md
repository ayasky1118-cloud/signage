# 既存DB用 ALTER スクリプト

既に `00_schema` でテーブルを作成済みの環境で、スキーマ変更を適用するときに使用します。

## 実行方法

コンテナが起動している前提で、対象DBに接続して実行します。

```bash
# 例: signage-db コンテナ内の MySQL に適用
docker exec -i signage-db mysql -uroot -ppassword --default-character-set=utf8mb4 signage_dev < db/01_alter/001_order_main_design_type_and_columns.sql
```

**注意:** 各スクリプトは「既存DBに1回だけ」実行する想定です。二重実行するとエラーになります。
