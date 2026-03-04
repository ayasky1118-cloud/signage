-- 開発DBリセット用：全テーブルを依存関係の逆順で削除
-- 実行後、001〜010のDDLを順に実行して再作成すること

DROP TABLE IF EXISTS order_detail;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS order_main;
DROP TABLE IF EXISTS order_no_seq;
DROP TABLE IF EXISTS template_item;
DROP TABLE IF EXISTS template;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS design_type;
DROP TABLE IF EXISTS company;
