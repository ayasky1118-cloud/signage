CREATE TABLE IF NOT EXISTS order_no_seq
(
	company_id			BIGINT		NOT NULL							COMMENT '所属会社ID'
,	`year`				SMALLINT UNSIGNED	NOT NULL					COMMENT '年'
,	last_number			INT UNSIGNED	NOT NULL						COMMENT '最終連番'
,	is_deleted			BOOLEAN		NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_order_no_seq
		PRIMARY KEY (company_id, `year`, last_number)
,	CONSTRAINT fk_order_seq_company
		FOREIGN KEY (company_id) REFERENCES company(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='注文番号採番管理情報'
;
