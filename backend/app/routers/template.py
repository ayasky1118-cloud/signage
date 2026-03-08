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
    customer_id: int | None = Query(None, description="顧客ID（指定時は当該顧客に紐づくテンプレートのみ返す）"),
):
    """
    指定会社に紐づくテンプレート一覧を表示順で返す。
    customer_id 指定時は当該顧客専用テンプレートのみ返す（顧客ごとにテンプレートを紐づけ可能）。
    """
    if customer_id is not None:
        sql = text("""
            SELECT template_id, company_id, template_name, display_order
            FROM template
            WHERE company_id = :company_id AND customer_id = :customer_id AND is_deleted = 0
            ORDER BY display_order, template_id
        """)
        params = {"company_id": company_id, "customer_id": customer_id}
    else:
        sql = text("""
            SELECT template_id, company_id, template_name, display_order
            FROM template
            WHERE company_id = :company_id AND is_deleted = 0
            ORDER BY display_order, template_id
        """)
        params = {"company_id": company_id}
    rows = db.execute(sql, params).mappings().all()
    return [
        {
            "templateId": r["template_id"],
            "companyId": r["company_id"],
            "templateName": r["template_name"],
            "displayOrder": r["display_order"],
        }
        for r in rows
    ]
