"""
テンプレート項目API。

template_id に紐づく template_item 一覧を返す（注文フォームのテンプレート項目表示用）。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/template-items", tags=["template-items"])


@router.get("")
def list_template_items(
    db: Session = Depends(get_db),
    template_id: int = Query(..., description="テンプレートID"),
):
    """
    指定テンプレートに紐づく template_item 一覧を表示順で返す。
    各項目の item_type に応じてフロントで入力UI（テキスト・数値・日付等）を切り替える。
    """
    sql = text("""
        SELECT template_item_id, template_id, item_name, item_type, is_required, display_order
        FROM template_item
        WHERE template_id = :template_id AND is_deleted = 0
        ORDER BY display_order, template_item_id
    """)
    rows = db.execute(sql, {"template_id": template_id}).mappings().all()
    return [
        {
            "templateItemId": r["template_item_id"],
            "templateId": r["template_id"],
            "itemName": r["item_name"],
            "itemType": r["item_type"],
            "isRequired": bool(r["is_required"]),
            "displayOrder": r["display_order"],
        }
        for r in rows
    ]
