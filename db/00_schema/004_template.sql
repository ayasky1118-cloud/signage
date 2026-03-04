CREATE TABLE IF NOT EXISTS template
(
	template_id     	BIGINT AUTO_INCREMENT							COMMENT 'テンプレートID'
,	company_id      	BIGINT NOT NULL									COMMENT '会社ID'
,	customer_id     	BIGINT NOT NULL									COMMENT '顧客ID'
,	template_name   	VARCHAR(100) NOT NULL							COMMENT 'テンプレート名'
,	template_data   	TEXT											COMMENT 'テンプレートデータ'
,	display_order   	INT NOT NULL									COMMENT '表示順'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_template
		PRIMARY KEY (template_id)
,	CONSTRAINT fk_template_company
		FOREIGN KEY (company_id) REFERENCES company(company_id)
,	CONSTRAINT fk_template_customer
		FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='テンプレート情報'
;
