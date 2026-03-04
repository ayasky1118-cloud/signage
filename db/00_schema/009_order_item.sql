CREATE TABLE IF NOT EXISTS order_item
(
	order_item_id		BIGINT AUTO_INCREMENT							COMMENT '注文項目ID'
,	order_id			BIGINT NOT NULL									COMMENT '受注ID'
,	template_item_id	BIGINT NOT NULL									COMMENT 'テンプレート項目ID'
,	order_item_val		VARCHAR(200)									COMMENT '注文項目値'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_order_item
		PRIMARY KEY (order_item_id)
,	CONSTRAINT fk_order_item_order
		FOREIGN KEY (order_id)
		REFERENCES order_main(order_id)
		ON DELETE CASCADE
,	CONSTRAINT fk_order_item_template_item
		FOREIGN KEY (template_item_id)
		REFERENCES template_item(template_item_id)
		ON DELETE CASCADE
,	CONSTRAINT uq_order_item_unique
		UNIQUE (order_id, template_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='注文項目情報'
;
