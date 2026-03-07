SET NAMES utf8mb4;

DROP TABLE IF EXISTS order_detail;

CREATE TABLE order_detail
(
	order_detail_id		BIGINT AUTO_INCREMENT							COMMENT '注文詳細ID'
,	order_id			BIGINT NOT NULL									COMMENT '受注ID'
,	branch_no			VARCHAR(2) NOT NULL								COMMENT '枝番'
,	design_data			JSON											COMMENT 'デザイン編集データ'
,	last_export_type	VARCHAR(50)										COMMENT '最終出力種別'
,	last_export_dt		DATETIME										COMMENT '最終出力日時'
,	last_export_by		BIGINT											COMMENT '最終出力者'
,	last_export_key		TEXT											COMMENT '保存先キー'
,	note				TEXT											COMMENT '備考（枝番毎。order_main.note と同様）'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_order_detail
		PRIMARY KEY (order_detail_id)
,	CONSTRAINT fk_order_detail_order
		FOREIGN KEY (order_id) REFERENCES order_main(order_id)
		ON DELETE CASCADE
,	CONSTRAINT uq_order_detail_branch
		UNIQUE (order_id, branch_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='受注詳細情報'
;
