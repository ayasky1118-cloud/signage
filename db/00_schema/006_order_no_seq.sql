CREATE TABLE IF NOT EXISTS order_no_seq
(
	`year`				INT NOT NULL PRIMARY KEY						COMMENT '年（YYYY）'
,	last_number			INT NOT NULL DEFAULT 0							COMMENT '最終連番'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
)
COMMENT='注文番号採番管理情報'
;
