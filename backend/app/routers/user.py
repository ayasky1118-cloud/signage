"""
ユーザー一覧API・認証突合用API。

・list_users: company_id に紐づく user 一覧（担当者選択用）
・get_user_by_auth_uid: auth_uid（Cognito sub）で user マスタ検索。ログイン可否の突合用。
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/by-auth-uid")
def get_user_by_auth_uid(
    db: Session = Depends(get_db),
    auth_uid: str = Query(..., description="Cognito sub（認証UID）。user マスタの auth_uid と突合"),
):
    """
    auth_uid（Cognito sub）で user マスタを検索する。
    存在すればユーザー情報を返し、存在しなければ 404 を返す。
    ログイン時にフロントから呼び出し、マスタに存在しない場合は「ログインできません」とする。
    """
    row = (
        db.execute(
            text("""
                SELECT user_id, company_id, auth_uid, email, user_name, role
                FROM `user`
                WHERE auth_uid = :auth_uid AND is_deleted = 0
            """),
            {"auth_uid": auth_uid},
        )
        .mappings()
        .first()
    )
    if not row:
        return JSONResponse(status_code=404, content={"detail": "User not found in master"})
    return {
        "userId": row["user_id"],
        "companyId": row["company_id"],
        "authUid": row["auth_uid"] or "",
        "email": row["email"] or "",
        "userName": row["user_name"] or "",
        "role": row["role"] or "",
    }


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    company_id: int = Query(..., description="会社ID（ログイン会社。この会社に紐づくユーザーを返す）"),
):
    """
    指定会社に紐づくユーザー一覧を返す。
    """
    rows = (
        db.execute(
            text("""
                SELECT user_id, company_id, user_name
                FROM `user`  -- user は MySQL 予約語のためバッククォートでエスケープ
                WHERE company_id = :company_id AND is_deleted = 0
                ORDER BY user_id
            """),
            {"company_id": company_id},
        )
        .mappings()
        .all()
    )
    return [
        {
            "userId": r["user_id"],
            "companyId": r["company_id"],
            "userName": r["user_name"] or "",
        }
        for r in rows
    ]
