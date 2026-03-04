CREATE TABLE IF NOT EXISTS order_main
(
	order_id			BIGINT AUTO_INCREMENT PRIMARY KEY				COMMENT '受注ID'
,	company_id			BIGINT NOT NULL									COMMENT '会社ID'
,	customer_id			BIGINT NOT NULL									COMMENT '顧客ID'
,	template_id			BIGINT NOT NULL									COMMENT 'テンプレートID'
,	order_no			VARCHAR(9) NOT NULL								COMMENT '受注番号'
,	order_name			VARCHAR(256) NOT NULL							COMMENT '受注名'
,	order_add			VARCHAR(256) NOT NULL							COMMENT '受注住所'
,	design_type			VARCHAR(10) NOT NULL							COMMENT 'デザイン種別'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT uq_order_main_order_no UNIQUE (order_no)
,	CONSTRAINT fk_order_main_company
		FOREIGN KEY (company_id) REFERENCES company(company_id)
,	CONSTRAINT fk_order_main_customer
		FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
,	CONSTRAINT fk_order_main_template
		FOREIGN KEY (template_id) REFERENCES template(template_id)
)
COMMENT='受注情報'
;
