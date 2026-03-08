"""
顧客一覧API。

ログイン会社（company_id）に紐づく customer 一覧を返す。
注文フォームの「顧客」選択モーダル用。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
def list_customers(
    db: Session = Depends(get_db),
    company_id: int = Query(..., description="会社ID（ログイン会社。この会社に紐づく顧客を返す）"),
):
    """
    指定会社に紐づく顧客一覧を返す。
    """
    rows = (
        db.execute(
            text("""
                SELECT customer_id, company_id, customer_name, customer_post, customer_add, contact_name
                FROM customer
                WHERE company_id = :company_id AND is_deleted = 0
                ORDER BY customer_id
            """),
            {"company_id": company_id},
        )
        .mappings()
        .all()
    )
    # レスポンス: customer_add → address に変換（API のセマンティック名）。customer_post は省略
    return [
        {
            "customer_id": r["customer_id"],
            "company_id": r["company_id"],
            "customer_name": r["customer_name"] or "",
            "address": (r["customer_add"] or "").strip(),
            "contact_name": r["contact_name"] or "",
        }
        for r in rows
    ]
