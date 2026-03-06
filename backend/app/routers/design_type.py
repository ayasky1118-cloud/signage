"""
デザイン種別マスタAPI。

company_id に紐づく design_type 一覧を返す（注文フォームのセレクト用）。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/design-types", tags=["design-types"])


@router.get("")
def list_design_types(
    db: Session = Depends(get_db),
    company_id: int | None = Query(None, description="会社ID（未指定時は全件・一覧検索用）"),
):
    """
    デザイン種別マスタ一覧を返す。
    company_id 指定時はその会社のみ、未指定時は全件（注文一覧の検索条件用）。
    """
    if company_id is not None:
        sql = text("""
            SELECT design_type_id, company_id, design_type_name, display_order
            FROM design_type
            WHERE company_id = :company_id AND is_deleted = 0
            ORDER BY display_order, design_type_id
        """)
        rows = db.execute(sql, {"company_id": company_id}).mappings().all()
    else:
        sql = text("""
            SELECT design_type_id, company_id, design_type_name, display_order
            FROM design_type
            WHERE is_deleted = 0
            ORDER BY company_id, display_order, design_type_id
        """)
        rows = db.execute(sql).mappings().all()
    return [
        {
            "designTypeId": r["design_type_id"],
            "companyId": r["company_id"],
            "designTypeName": r["design_type_name"],
            "displayOrder": r["display_order"],
        }
        for r in rows
    ]
