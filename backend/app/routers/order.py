"""
注文一覧検索API・注文登録API。

【一覧検索】GET /orders
  order_main を中心に company, customer, template, user, order_detail を JOIN し、
  検索条件に応じて一覧を返す。order_detail が無い場合は枝番は空配列。

【新規登録】POST /orders
  1. order_no_seq: ログイン会社・当年で採番（該当無ければ last_number=1 で新規）。
     order_no = 年4桁 + last_number を0埋め6桁。
  2. order_main: テンプレート項目以外（会社・顧客・テンプレート・受注番号・受注名・住所・デザイン種別）を登録。
  3. order_item: テンプレート項目ごとに1行、入力値を order_item_val に格納（可変項目）。
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])

# 認証未実装のため登録・更新者IDは固定（将来は認証から取得）
DEFAULT_USER_ID = 1


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


# -----------------------------
# 注文登録
# -----------------------------


def _next_order_no(db: Session, company_id: int, user_id: int) -> str:
    """
    受注番号を採番する（order_no_seq に基づく）。

    - ログイン会社（company_id）とシステムの当年が一致する order_no_seq の
      last_number の最大値を取得。該当行がなければ 0 として扱い、次番号は 1。
    - 採番した番号を履歴として order_no_seq に新規 INSERT する
      （同一 company_id・year で last_number を積み上げる設計）。
    - 戻り値: 年4桁 + last_number を0埋め6桁の文字列（例: 2025000001）。

    Args:
        db: DB セッション
        company_id: ログイン会社ID（採番の単位）
        user_id: 作成者・更新者（order_no_seq の created_by / updated_by）

    Returns:
        採番された order_no 文字列
    """
    now = datetime.now()
    year = now.year
    # 該当年・該当会社の既存採番の最大 last_number を取得（無ければ 0）
    r = db.execute(
        text("""
            SELECT COALESCE(MAX(last_number), 0) AS max_no
            FROM order_no_seq
            WHERE company_id = :company_id AND `year` = :year AND is_deleted = 0
        """),
        {"company_id": company_id, "year": year},
    ).fetchone()
    next_no = (r[0] or 0) + 1
    # 今回使用する番号を order_no_seq に INSERT（履歴として残し、次回は MAX+1 で採番）
    db.execute(
        text("""
            INSERT INTO order_no_seq (company_id, `year`, last_number, is_deleted, created_by, updated_by)
            VALUES (:company_id, :year, :last_number, 0, :created_by, :updated_by)
        """),
        {
            "company_id": company_id,
            "year": year,
            "last_number": next_no,
            "created_by": user_id,
            "updated_by": user_id,
        },
    )
    db.flush()
    return f"{year:04d}{next_no:06d}"


@router.post("")
def create_order(
    db: Session = Depends(get_db),
    login_company_id: int = Body(..., embed=True, alias="loginCompanyId"),
    order_name: str = Body(..., embed=True, alias="orderName"),
    order_add: str = Body(..., embed=True, alias="orderAdd"),
    company_id: int = Body(..., embed=True, alias="companyId"),
    template_id: int = Body(..., embed=True, alias="templateId"),
    design_type_id: int = Body(..., embed=True, alias="designTypeId"),
    template_items: list[dict] = Body(..., embed=True, alias="templateItems"),
):
    """
    注文を新規登録する。

    処理順:
    1. リクエストの companyId に紐づく customer を1件取得（無い場合は 400）。
    2. order_no_seq で受注番号を採番（ログイン会社・当年。形式: 年4桁+連番6桁）。
    3. order_main に登録（会社・顧客・テンプレート・受注番号・受注名・住所・デザイン種別）。
    4. テンプレート項目ごとに order_item を登録（template_item_id と入力値を order_item_val に格納）。

    リクエスト Body（JSON）:
        loginCompanyId: ログイン会社ID（採番に使用）
        orderName: 受注名
        orderAdd: 受注住所
        companyId: 注文先会社ID（order_main.company_id。この会社に紐づく顧客を customer_id に使用）
        templateId: テンプレートID
        designTypeId: デザイン種別ID
        templateItems: [ { "templateItemId": number, "orderItemVal": string }, ... ]
            テンプレート項目ごとの ID と入力値。可変長。

    レスポンス: { "orderNo": str, "orderId": int }
    エラー: 400（顧客不在）、500（DB エラー等）
    """
    try:
        user_id = DEFAULT_USER_ID
        # 注文先会社に紐づく顧客を1件取得（order_main.customer_id 用）。いなければ 400
        cust = db.execute(
            text("""
                SELECT customer_id FROM customer
                WHERE company_id = :company_id AND is_deleted = 0
                ORDER BY customer_id LIMIT 1
            """),
            {"company_id": company_id},
        ).fetchone()
        if not cust:
            return JSONResponse(
                status_code=400,
                content={"detail": "指定された会社に紐づく顧客が存在しません。"},
            )
        customer_id = cust[0]

        # 受注番号を採番（ログイン会社・当年。order_no_seq に基づく）
        order_no = _next_order_no(db, login_company_id, user_id)

        # order_main に登録（テンプレート項目以外。company_id＝注文先会社、customer_id＝上で取得した顧客）
        db.execute(
            text("""
                INSERT INTO order_main
                (company_id, customer_id, template_id, order_no, order_name, order_add, design_type_id, is_deleted, created_by, updated_by)
                VALUES (:company_id, :customer_id, :template_id, :order_no, :order_name, :order_add, :design_type_id, 0, :created_by, :updated_by)
            """),
            {
                "company_id": company_id,
                "customer_id": customer_id,
                "template_id": template_id,
                "order_no": order_no,
                "order_name": order_name.strip(),
                "order_add": order_add.strip(),
                "design_type_id": design_type_id,
                "created_by": user_id,
                "updated_by": user_id,
            },
        )
        db.flush()
        # 挿入した order_main の order_id を取得（AUTO_INCREMENT。order_item の FK に必要）
        order_id_row = db.execute(text("SELECT LAST_INSERT_ID()")).fetchone()
        order_id = order_id_row[0] if order_id_row else None
        if not order_id:
            db.rollback()
            return JSONResponse(status_code=500, content={"detail": "order_main の登録に失敗しました。"})

        # テンプレート項目を order_item に登録（1項目1行。入力値は order_item_val、最大200文字）
        for item in template_items:
            tid = item.get("templateItemId")
            val = item.get("orderItemVal")
            if tid is None:
                continue
            val_str = (val if val is not None else "").strip()[:200]
            db.execute(
                text("""
                    INSERT INTO order_item (order_id, template_item_id, order_item_val, is_deleted, created_by, updated_by)
                    VALUES (:order_id, :template_item_id, :order_item_val, 0, :created_by, :updated_by)
                """),
                {
                    "order_id": order_id,
                    "template_item_id": tid,
                    "order_item_val": val_str,
                    "created_by": user_id,
                    "updated_by": user_id,
                },
            )
        db.commit()
        return {"orderNo": order_no, "orderId": order_id}
    except Exception as e:
        db.rollback()
        logger.exception("注文登録でエラー")
        return JSONResponse(
            status_code=500,
            content={"detail": "注文の登録に失敗しました。", "error": str(e)},
        )
