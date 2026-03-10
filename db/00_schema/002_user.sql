CREATE TABLE IF NOT EXISTS user
(
	user_id				BIGINT AUTO_INCREMENT							COMMENT 'ユーザーID'
,	company_id			BIGINT NOT NULL									COMMENT '会社ID'
,	auth_uid			TEXT											COMMENT '認証UID'
,	email				VARCHAR(256) NOT NULL UNIQUE					COMMENT 'メールアドレス'
,	user_name			VARCHAR(100) NOT NULL							COMMENT 'ユーザー名'
,	is_super_admin		BOOLEAN NOT NULL DEFAULT FALSE					COMMENT '全体管理者フラグ'
,	role				VARCHAR(50) 	 								COMMENT '会社内ロール'
,	is_deleted			BOOLEAN 	NOT NULL DEFAULT FALSE				COMMENT '削除フラグ'
,	created_dt			DATETIME 	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '作成日時'
,	created_by			BIGINT		NOT NULL							COMMENT '作成者'
,	updated_dt			DATETIME	NOT NULL DEFAULT CURRENT_TIMESTAMP	COMMENT '更新日時'
,	updated_by			BIGINT		NOT NULL							COMMENT '更新者'
,	CONSTRAINT pk_user
		PRIMARY KEY (user_id)
,	CONSTRAINT fk_user_company
	FOREIGN KEY (company_id) REFERENCES company(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='ユーザー情報'
;