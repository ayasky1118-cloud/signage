CREATE TABLE IF NOT EXISTS company
(
	company_id			BIGINT AUTO_INCREMENT							COMMENT '会社ID'
,	company_code		VARCHAR(50)		NOT NULL UNIQUE					COMMENT '会社コード'
,	company_name		VARCHAR(256)	NOT NULL 						COMMENT '会社名'
,	company_post		VARCHAR(7)										COMMENT '郵便番号'
,	company_add			VARCHAR(256)									COMMENT '住所'
,	company_tel			VARCHAR(20)										COMMENT '電話番号'
,	company_fax			VARCHAR(20)										COMMENT 'FAX番号'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_company
		PRIMARY KEY (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='会社情報'
;
