"""
ユーザー一覧API。

company_id（ログイン会社）に紐づく user 一覧を返す（担当者選択用）。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/users", tags=["users"])


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
                FROM `user`
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
