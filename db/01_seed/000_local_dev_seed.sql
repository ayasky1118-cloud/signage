-- ローカル開発用: company と user の初期データ
-- 実行: docker exec -i signage-db mysql -uroot -ppassword --default-character-set=utf8mb4 signage_dev < db/01_seed/000_local_dev_seed.sql
--
-- ログインするには、user の auth_uid を Cognito の sub に更新する必要があります。
-- 1. このシードを実行後、一度ログインを試す
-- 2. 「ログインできません」画面に表示される Cognito sub をコピー
-- 3. 以下を実行: UPDATE user SET auth_uid = 'コピーしたsub' WHERE user_id = 1;

SET NAMES utf8mb4;

-- company 1件（既存データがあればスキップ）
INSERT IGNORE INTO company (company_id, company_code, company_name, company_post, company_add, is_deleted, created_by, updated_by)
VALUES (1, 'DEV001', '開発用会社', '100-0001', '東京都千代田区', FALSE, 0, 0);

-- user 1件（auth_uid は後で UPDATE する）
INSERT IGNORE INTO user (user_id, company_id, auth_uid, email, user_name, is_super_admin, role, is_deleted, created_by, updated_by)
VALUES (1, 1, NULL, 'dev@example.com', '開発ユーザー', TRUE, 'admin', FALSE, 1, 1);
