-- html_object / html_object_value のテストデータ
-- 方式B: 線の種類・色・太さを3つのドロップダウンで選択
-- 実行: docker exec -i signage-db mysql -uroot -ppassword --default-character-set=utf8mb4 signage_dev < db/01_seed/010_html_object_seed.sql

SET NAMES utf8mb4;

-- 既存データ削除（TRUNCATE で AUTO_INCREMENT をリセットし、ID を 1 からにする）
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE html_object_value;
TRUNCATE TABLE html_object;
SET FOREIGN_KEY_CHECKS = 1;

-- html_object（カテゴリ）
-- ROUTE_DRAWING: ルート描画セクション（3つのドロップダウン＋描画・確定ボタン用のコンテナ）
-- ROUTE_LINE_TYPE, ROUTE_LINE_COLOR, ROUTE_LINE_WIDTH: 線の種類・色・太さの選択肢
INSERT INTO html_object (category_code, category_name, html_object_type, has_child_table, display_order) VALUES
('ROUTE_DRAWING', 'ルート描画', 'DROPDOWN', TRUE, 10),
('ROUTE_LINE_TYPE', '線の種類', 'DROPDOWN', TRUE, 11),
('ROUTE_LINE_COLOR', '線の色', 'DROPDOWN', TRUE, 12),
('ROUTE_LINE_WIDTH', '線の太さ', 'DROPDOWN', TRUE, 13),
('TEXT_PLACEMENT', 'テキスト配置', 'TEXT', TRUE, 20),
('IMAGE_PLACEMENT', '画像配置', 'IMAGE', TRUE, 30),
('BALLOON_PLACEMENT', '吹き出し配置', 'BALLOON', FALSE, 40);

-- html_object_value（線の種類）
-- value_data: {"style":"solid|dashed","stripe":bool}
INSERT INTO html_object_value (html_object_id, value_code, value_name, value_data, sample_image_path, display_order) VALUES
(2, 'SOLID', '単色', '{"style":"solid","stripe":false}', NULL, 10),
(2, 'STRIPE', '選択した色と白の縞線', '{"style":"solid","stripe":true}', NULL, 20),
(2, 'DASHED', '選択した色の点線', '{"style":"dashed","stripe":false}', NULL, 30);

-- html_object_value（線の色）
-- value_data: {"color":"#HEX"}
-- CMYK参考: 赤 C0 M100 Y100 K0, 青 C100 M50 Y0 K0, 白 C0 M0 Y0 K0, グレー C0 M0 Y0 K50, ピンク C0 M100 Y0 K0
INSERT INTO html_object_value (html_object_id, value_code, value_name, value_data, sample_image_path, display_order) VALUES
(3, 'RED', '赤', '{"color":"#E60012"}', NULL, 10),
(3, 'BLUE', '青', '{"color":"#0066B3"}', NULL, 20),
(3, 'WHITE', '白', '{"color":"#FFFFFF"}', NULL, 30),
(3, 'GRAY', 'グレー', '{"color":"#808080"}', NULL, 40),
(3, 'PINK', 'ピンク', '{"color":"#E6007E"}', NULL, 50);

-- html_object_value（線の太さ）
-- value_data: {"width":N}
INSERT INTO html_object_value (html_object_id, value_code, value_name, value_data, sample_image_path, display_order) VALUES
(4, 'W2', '2px', '{"width":2}', NULL, 10),
(4, 'W3', '3px', '{"width":3}', NULL, 20),
(4, 'W4', '4px', '{"width":4}', NULL, 30),
(4, 'W6', '6px', '{"width":6}', NULL, 40);

-- html_object_value（テキスト配置: プレースホルダー）
INSERT INTO html_object_value (html_object_id, value_code, value_name, value_data, sample_image_path, display_order) VALUES
(5, 'TEXT_DEFAULT', 'テキスト', NULL, NULL, 10);

-- html_object_value（画像配置: プレースホルダー）
INSERT INTO html_object_value (html_object_id, value_code, value_name, value_data, sample_image_path, display_order) VALUES
(6, 'IMAGE_PLACEHOLDER', '画像', NULL, NULL, 10);
