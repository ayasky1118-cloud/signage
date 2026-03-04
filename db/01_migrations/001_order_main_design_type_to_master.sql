-- order_main.design_type (VARCHAR) を design_type_id (BIGINT) に変更
-- 前提: 007_design_type.sql が実行済みであること

-- 1. 新規カラム追加（NULLable）
ALTER TABLE order_main
	ADD COLUMN design_type_id BIGINT NULL COMMENT 'デザイン種別ID' AFTER order_add;

-- 2. 既存の design_type 文字列がマスタにない場合はマスタに登録（created_by=0 は移行用）
INSERT INTO design_type (company_id, design_type_name, display_order, is_deleted, created_dt, created_by, updated_dt, updated_by)
SELECT DISTINCT
	om.company_id,
	om.design_type,
	0,
	0,
	CURRENT_TIMESTAMP,
	0,
	CURRENT_TIMESTAMP,
	0
FROM order_main om
LEFT JOIN design_type dt
	ON om.company_id = dt.company_id AND om.design_type = dt.design_type_name AND dt.is_deleted = 0
WHERE dt.design_type_id IS NULL
  AND om.design_type IS NOT NULL
  AND om.design_type != '';

-- 3. 既存データをマスタに紐づけ
UPDATE order_main om
INNER JOIN design_type dt
	ON om.company_id = dt.company_id AND om.design_type = dt.design_type_name AND dt.is_deleted = 0
SET om.design_type_id = dt.design_type_id;

-- 4. 旧カラム削除
ALTER TABLE order_main
	DROP COLUMN design_type;

-- 5. NOT NULL に変更
ALTER TABLE order_main
	MODIFY COLUMN design_type_id BIGINT NOT NULL COMMENT 'デザイン種別ID';

-- 6. FK 追加
ALTER TABLE order_main
	ADD CONSTRAINT fk_order_main_design_type
		FOREIGN KEY (design_type_id) REFERENCES design_type(design_type_id);
