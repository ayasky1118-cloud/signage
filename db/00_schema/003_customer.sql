CREATE TABLE IF NOT EXISTS customer
(
	customer_id			BIGINT AUTO_INCREMENT PRIMARY KEY				COMMENT '顧客ID'
,	company_id			BIGINT NOT NULL									COMMENT '会社ID'
,	customer_name		VARCHAR(200) NOT NULL							COMMENT '顧客名'
,	customer_post		VARCHAR(7)										COMMENT	'郵便番号'
,	customer_add		VARCHAR(200)									COMMENT '住所'
,	customer_tel		VARCHAR(20)										COMMENT '電話番号'
,	customer_fax		VARCHAR(20)										COMMENT 'FAX番号'
,	contact_name		VARCHAR(100)									COMMENT '担当者名'
,	contact_email		VARCHAR(200)									COMMENT '担当者メールアドレス'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	 CONSTRAINT fk_customer_company
		FOREIGN KEY (company_id) REFERENCES company(company_id)
)
COMMENT='顧客情報'
;
