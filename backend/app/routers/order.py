"""
注文一覧検索API。

order_main を中心に company, customer, template, user, order_detail を JOIN し、
検索条件に応じて一覧を返す。
order_main のみ存在し order_detail が無いケースも含める（枝番は空配列）。
"""

import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("")
def search_orders(
    db: Session = Depends(get_db),
    order_no: str | None = Query(None, description="注文番号（部分一致）"),
    order_name: str | None = Query(None, description="注文名（部分一致）"),
    address: str | None = Query(None, description="住所（部分一致）"),
    company_name: str | None = Query(None, description="会社名（部分一致）"),
    design_type_id: int | None = Query(None, description="デザイン種別ID（完全一致）"),
    design_type_name: str | None = Query(None, description="デザイン種別名（部分一致）"),
    update_date_from: str | None = Query(None, description="更新日開始（YYYY-MM-DD）"),
    update_date_to: str | None = Query(None, description="更新日終了（YYYY-MM-DD）"),
    updater: str | None = Query(None, description="更新者名（部分一致）"),
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(10, ge=1, le=100, description="1ページあたり件数"),
):
    """
    注文一覧を検索する。

    検索条件はすべてオプション。指定した条件で AND 検索。
    ページネーション対応（サーバー側）。
    """
    try:
        return _search_orders_impl(
            db=db,
            order_no=order_no,
            order_name=order_name,
            address=address,
            company_name=company_name,
            design_type_id=design_type_id,
            design_type_name=design_type_name,
            update_date_from=update_date_from,
            update_date_to=update_date_to,
            updater=updater,
            page=page,
            per_page=per_page,
        )
    except Exception as e:
        logger.exception("注文一覧検索でエラー")
        return JSONResponse(
            status_code=500,
            content={"detail": "サーバーでエラーが発生しました。", "error": str(e)},
        )


def _search_orders_impl(
    db: Session,
    order_no: str | None,
    order_name: str | None,
    address: str | None,
    company_name: str | None,
    design_type_id: int | None,
    design_type_name: str | None,
    update_date_from: str | None,
    update_date_to: str | None,
    updater: str | None,
    page: int,
    per_page: int,
):
    offset = (page - 1) * per_page

    # 条件句の組み立て（プレースホルダは :name 形式）
    conditions = ["om.is_deleted = 0"]
    params = {"limit": per_page, "offset": offset}

    if order_no and order_no.strip():
        conditions.append("om.order_no LIKE :order_no")
        params["order_no"] = f"%{order_no.strip()}%"

    if order_name and order_name.strip():
        conditions.append("om.order_name LIKE :order_name")
        params["order_name"] = f"%{order_name.strip()}%"

    if address and address.strip():
        conditions.append("om.order_add LIKE :address")
        params["address"] = f"%{address.strip()}%"

    if company_name and company_name.strip():
        conditions.append("c.company_name LIKE :company_name")
        params["company_name"] = f"%{company_name.strip()}%"

    if design_type_id is not None:
        conditions.append("om.design_type_id = :design_type_id")
        params["design_type_id"] = design_type_id
    if design_type_name and design_type_name.strip():
        conditions.append("dt.design_type_name LIKE :design_type_name")
        params["design_type_name"] = f"%{design_type_name.strip()}%"

    if update_date_from and update_date_from.strip():
        conditions.append("DATE(om.updated_dt) >= :update_date_from")
        params["update_date_from"] = update_date_from.strip()

    if update_date_to and update_date_to.strip():
        conditions.append("DATE(om.updated_dt) <= :update_date_to")
        params["update_date_to"] = update_date_to.strip()

    if updater and updater.strip():
        conditions.append("u.user_name LIKE :updater")
        params["updater"] = f"%{updater.strip()}%"

    where_clause = " AND ".join(conditions)

    # 枝番はサブクエリで取得（order_detail が無い場合は NULL → 空文字に変換して split）
    sql = f"""
        SELECT
            om.order_id,
            om.order_no,
            om.order_name,
            om.order_add,
            om.company_id,
            om.design_type_id,
            dt.design_type_name,
            om.updated_dt,
            c.company_name,
            cus.contact_name AS manager_name,
            t.template_name,
            u.user_name AS updater_name,
            (SELECT GROUP_CONCAT(od.branch_no ORDER BY od.branch_no)
             FROM order_detail od
             WHERE od.order_id = om.order_id AND od.is_deleted = 0) AS branches_str
        FROM order_main om
        LEFT JOIN company c ON om.company_id = c.company_id AND c.is_deleted = 0
        LEFT JOIN customer cus ON om.customer_id = cus.customer_id AND cus.is_deleted = 0
        LEFT JOIN template t ON om.template_id = t.template_id AND t.is_deleted = 0
        LEFT JOIN design_type dt ON om.design_type_id = dt.design_type_id AND dt.is_deleted = 0
        LEFT JOIN `user` u ON om.updated_by = u.user_id AND u.is_deleted = 0
        WHERE {where_clause}
        ORDER BY om.updated_dt DESC
        LIMIT :limit OFFSET :offset
    """

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM order_main om
        LEFT JOIN company c ON om.company_id = c.company_id AND c.is_deleted = 0
        LEFT JOIN customer cus ON om.customer_id = cus.customer_id AND cus.is_deleted = 0
        LEFT JOIN template t ON om.template_id = t.template_id AND t.is_deleted = 0
        LEFT JOIN design_type dt ON om.design_type_id = dt.design_type_id AND dt.is_deleted = 0
        LEFT JOIN `user` u ON om.updated_by = u.user_id AND u.is_deleted = 0
        WHERE {where_clause}
    """

    # 総件数取得（LIMIT/OFFSET 用の params から除外）
    count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
    total_row = db.execute(text(count_sql), count_params).fetchone()
    total = total_row[0] if total_row else 0

    # 一覧取得
    rows = db.execute(text(sql), params).mappings().all()

    # レスポンス形式に変換
    items = []
    for r in rows:
        branches_str = r.get("branches_str")
        branches = branches_str.split(",") if branches_str else []

        # updated_dt を YYYY/MM/DD 形式に
        updated_dt = r.get("updated_dt")
        update_date = ""
        if updated_dt:
            if hasattr(updated_dt, "strftime"):
                update_date = updated_dt.strftime("%Y/%m/%d")
            else:
                update_date = str(updated_dt)[:10].replace("-", "/")

        items.append({
            "orderNo": r.get("order_no", ""),
            "orderName": r.get("order_name", ""),
            "address": r.get("order_add", ""),
            "companyId": r.get("company_id"),
            "companyName": r.get("company_name") or "",
            "manager": r.get("manager_name") or "",
            "template": r.get("template_name") or "",
            "designTypeId": r.get("design_type_id"),
            "designType": r.get("design_type_name") or "",
            "updateDate": update_date,
            "updater": r.get("updater_name") or "",
            "branches": branches,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "perPage": per_page,
    }
