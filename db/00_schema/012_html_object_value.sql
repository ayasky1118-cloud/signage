SET NAMES utf8mb4;

DROP TABLE IF EXISTS html_object_value;

CREATE TABLE html_object_value
(
	html_object_value_id	BIGINT AUTO_INCREMENT							COMMENT 'HTMLオブジェクト値ID'
,	html_object_id		BIGINT			NOT NULL						COMMENT 'HTMLオブジェクトID'
,	value_code			VARCHAR(50)		NOT NULL						COMMENT '値コード'
,	value_name			VARCHAR(100)	NOT NULL						COMMENT '値の表示名'
,	value_data			VARCHAR(255)									COMMENT '実際の値（色コード・線種等）'
,	sample_image_path	VARCHAR(500)									COMMENT 'サンプル画像パス（プレビュー用）'
,	display_order		INT				NOT NULL DEFAULT 0				COMMENT '表示順'
,	is_deleted			BOOLEAN			NOT NULL DEFAULT FALSE			COMMENT '削除フラグ'
,	created_dt			DATETIME		NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT			NOT NULL DEFAULT 0				COMMENT '作成者'
,	updated_dt			DATETIME		NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT			NOT NULL DEFAULT 0				COMMENT '更新者'
,	CONSTRAINT pk_html_object_value
		PRIMARY KEY (html_object_value_id)
,	CONSTRAINT fk_html_object_value_html_object
		FOREIGN KEY (html_object_id) REFERENCES html_object(html_object_id)
		ON DELETE CASCADE
,	CONSTRAINT uq_html_object_value UNIQUE (html_object_id, value_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='HTMLオブジェクト値（全社共通マスタ）'
;
