"""
テンプレート一覧API。

company_id（ログイン会社）に紐づく template 一覧を返す（注文フォームのテンプレート選択用）。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
def list_templates(
    db: Session = Depends(get_db),
    company_id: int = Query(..., description="会社ID（ログイン会社）"),
):
    """
    指定会社に紐づくテンプレート一覧を表示順で返す。
    """
    sql = text("""
        SELECT template_id, company_id, template_name, display_order
        FROM template
        WHERE company_id = :company_id AND is_deleted = 0
        ORDER BY display_order, template_id
    """)
    rows = db.execute(sql, {"company_id": company_id}).mappings().all()
    return [
        {
            "templateId": r["template_id"],
            "companyId": r["company_id"],
            "templateName": r["template_name"],
            "displayOrder": r["display_order"],
        }
        for r in rows
    ]
