CREATE TABLE IF NOT EXISTS design_type
(
	design_type_id		BIGINT AUTO_INCREMENT							COMMENT 'デザイン種別ID'
,	company_id			BIGINT NOT NULL									COMMENT '会社ID'
,	design_type_name	VARCHAR(50) NOT NULL							COMMENT 'デザイン種別名'
,	display_order		INT NOT NULL DEFAULT 0							COMMENT '表示順'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_design_type
		PRIMARY KEY (design_type_id)
,	CONSTRAINT uq_design_type_company_name UNIQUE (company_id, design_type_name)
,	CONSTRAINT fk_design_type_company
		FOREIGN KEY (company_id) REFERENCES company(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='デザイン種別マスタ'
;
