-- order_main を新スキーマへ移行（既存DBに1回だけ実行）
-- 変更内容:
--   - design_type_id (BIGINT FK) → design_type (VARCHAR(50)) に変更し、マスタから名称を移行
--   - deadline_dt, proofreading_dt, note を追加
--   - attribute_04 / attribute_05 の COMMENT を更新

-- 1. 新カラム design_type を追加（NULL 許容で追加）
ALTER TABLE order_main
  ADD COLUMN design_type VARCHAR(50) NULL COMMENT 'デザイン種別' AFTER order_add;

-- 2. design_type マスタから名称を移行
UPDATE order_main om
  INNER JOIN design_type dt ON om.design_type_id = dt.design_type_id
  SET om.design_type = dt.design_type_name;

-- 3. マスタに存在しない行（削除済み等）は空文字で埋める
UPDATE order_main SET design_type = '' WHERE design_type IS NULL;

-- 4. design_type を NOT NULL に変更
ALTER TABLE order_main
  MODIFY COLUMN design_type VARCHAR(50) NOT NULL COMMENT 'デザイン種別';

-- 5. 納期・校正予定日・備考を追加
ALTER TABLE order_main
  ADD COLUMN deadline_dt DATETIME NULL COMMENT '納期' AFTER design_type_id,
  ADD COLUMN proofreading_dt DATETIME NULL COMMENT '校正予定日' AFTER deadline_dt,
  ADD COLUMN note TEXT NULL COMMENT '備考（複数行可）' AFTER attribute_10;

-- 6. 属性04・05 の COMMENT を更新
ALTER TABLE order_main
  MODIFY COLUMN attribute_04 VARCHAR(256) NULL COMMENT '属性04（制作区分）',
  MODIFY COLUMN attribute_05 VARCHAR(256) NULL COMMENT '属性05（ステータス）';

-- 7. 外部キー削除後に design_type_id を削除
ALTER TABLE order_main
  DROP FOREIGN KEY fk_order_main_design_type,
  DROP COLUMN design_type_id;
