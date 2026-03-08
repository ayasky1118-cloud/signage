SET NAMES utf8mb4;

DROP TABLE IF EXISTS html_object_value;
DROP TABLE IF EXISTS html_object;

CREATE TABLE html_object
(
	html_object_id		BIGINT AUTO_INCREMENT							COMMENT 'HTMLオブジェクトID'
,	category_code		VARCHAR(50)		NOT NULL UNIQUE				COMMENT '区分コード'
,	category_name		VARCHAR(100)	NOT NULL						COMMENT '区分名（表示用）'
,	html_object_type	VARCHAR(50)		NOT NULL						COMMENT 'HTMLオブジェクト種別（DROPDOWN/TEXT/IMAGE/BALLOON等）'
,	has_child_table		BOOLEAN			NOT NULL DEFAULT TRUE			COMMENT '子テーブル有無フラグ'
,	display_order		INT				NOT NULL DEFAULT 0				COMMENT '表示順'
,	is_deleted			BOOLEAN			NOT NULL DEFAULT FALSE			COMMENT '削除フラグ'
,	created_dt			DATETIME		NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT			NOT NULL DEFAULT 0				COMMENT '作成者'
,	updated_dt			DATETIME		NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT			NOT NULL DEFAULT 0				COMMENT '更新者'
,	CONSTRAINT pk_html_object
		PRIMARY KEY (html_object_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='HTMLオブジェクト（全社共通マスタ）'
;
