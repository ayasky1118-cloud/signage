CREATE TABLE IF NOT EXISTS template_item
(
	template_item_id	BIGINT AUTO_INCREMENT							COMMENT 'テンプレート項目ID'
,	template_id			BIGINT NOT NULL									COMMENT 'テンプレートID'
,	item_name			VARCHAR(256) NOT NULL							COMMENT '項目名'
,	item_type			VARCHAR(50)  NOT NULL							COMMENT '項目種別'
,	is_required			BOOLEAN NOT NULL DEFAULT FALSE					COMMENT '必須フラグ'
,	display_order		INT NOT NULL									COMMENT '表示順'
,	item_color			VARCHAR(50)									COMMENT '色'
,	item_font			TINYINT UNSIGNED								COMMENT 'フォントサイズ'
,	item_max_char		TINYINT UNSIGNED								COMMENT '最大文字数'
,	item_align			VARCHAR(1)	DEFAULT 'C'							COMMENT '揃え（L:左 C:中央 R:右）'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_template_item
		PRIMARY KEY (template_item_id)
,	CONSTRAINT fk_template_item_template
		FOREIGN KEY (template_id)
		REFERENCES template(template_id)
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='テンプレート項目情報'
;
