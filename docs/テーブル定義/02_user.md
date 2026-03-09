# user（ユーザー情報）

## テーブル概要

| 項目 | 内容 |
|------|------|
| 物理名 | user |
| 論理名 | ユーザー情報 |

## カラム定義

| No | 物理名 | 論理名 | 型 | 桁数 | 必須 | PK | FK | UK | 初期値 | 備考 |
|----|--------|--------|-----|------|------|----|----|----|--------|------|
| 1 | user_id | ユーザーID | BIGINT | - | ◯ | ◯ | - | - | - | AUTO_INCREMENT |
| 2 | company_id | 所属会社ID | BIGINT | - | ◯ | - | ◯ | - | - | 会社情報.会社ID |
| 3 | auth_uid | 認証UID | TEXT | - | - | - | - | - | - | Cognito の sub と紐付ける。ログイン突合用 |
| 4 | email | メールアドレス | VARCHAR | 256 | ◯ | - | - | - | - | ログインID想定 |
| 5 | user_name | ユーザー名 | VARCHAR | 100 | ◯ | - | - | - | - | 表示名 |
| 6 | is_super_admin | 全体管理者フラグ | BOOLEAN | - | - | - | - | - | FALSE | 会社横断の閲覧・操作権限 |
| 7 | role | 会社内ロール | VARCHAR | 50 | ◯ | - | - | - | - | admin / user / viewer を想定 |
| 8 | is_deleted | 削除フラグ | BOOLEAN | - | ◯ | - | - | - | FALSE | |
| 9 | created_dt | 作成日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 10 | created_by | 作成者 | BIGINT | - | ◯ | - | - | - | - | |
| 11 | updated_dt | 更新日時 | DATETIME | - | ◯ | - | - | - | 自動 | |
| 12 | updated_by | 更新者 | BIGINT | - | ◯ | - | - | - | - | |

## auth_uid とログイン突合

- **auth_uid** には Cognito User Pool の **sub**（ユーザー識別子）を格納する。
- sub はユーザー作成時に Cognito が付与する UUID で、永続的かつ一意。暗号化されていない。
- **ログイン時**: フロントは Cognito ログイン成功後に `getCurrentUser()` で sub を取得し、`GET /users/by-auth-uid?auth_uid={sub}` でマスタ検索する。
- **マスタに存在しない場合**: 「ログインできません」を表示し、signOut する。
- **事前設定**: Cognito コンソールでユーザーの sub を確認し、user マスタの auth_uid に登録しておく。
