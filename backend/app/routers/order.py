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

import json
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
    company_id: int | None = Query(None, description="会社ID（ログイン会社。指定時は当該会社の注文のみ返す）"),
    customer_id: int | None = Query(None, description="顧客ID（完全一致）"),
    manager: str | None = Query(None, description="担当者名（部分一致）"),
    order_name: str | None = Query(None, description="注文名（部分一致）"),
    design_type_id: int | None = Query(None, description="デザイン種別ID（完全一致）"),
    order_no: str | None = Query(None, description="注文番号（部分一致）"),
    address: str | None = Query(None, description="住所（部分一致）"),
    created_date_from: str | None = Query(None, description="登録日開始（YYYY-MM-DD）"),
    created_date_to: str | None = Query(None, description="登録日終了（YYYY-MM-DD）"),
    status: str | None = Query(None, description="ステータス（attribute_05、完全一致）"),
    production_type: str | None = Query(None, description="制作区分（attribute_04、完全一致）"),
    deadline_dt: str | None = Query(None, description="納期（YYYY-MM-DD、完全一致）"),
    proofreading_dt: str | None = Query(None, description="校正予定日（YYYY-MM-DD、完全一致）"),
    note: str | None = Query(None, description="備考（部分一致）"),
    sort_by: str | None = Query("created_date", description="ソート項目（order_no / created_date）"),
    sort_order: str | None = Query("asc", description="ソート順（asc / desc）"),
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(10, ge=1, le=100, description="1ページあたり件数"),
):
    """
    注文一覧を検索する。

    検索条件はすべてオプション。指定した条件で AND 検索。
    担当者名・注文名・住所・備考・注文番号は部分一致。
    デザイン種別はIDで完全一致。ステータス・制作区分・納期・校正予定日は入力値で完全一致。
    ページネーション対応（サーバー側）。
    """
    try:
        return _search_orders_impl(
            db=db,
            company_id=company_id,
            customer_id=customer_id,
            manager=manager,
            order_name=order_name,
            design_type_id=design_type_id,
            order_no=order_no,
            address=address,
            created_date_from=created_date_from,
            created_date_to=created_date_to,
            status=status,
            production_type=production_type,
            deadline_dt=deadline_dt,
            proofreading_dt=proofreading_dt,
            note=note,
            sort_by=sort_by,
            sort_order=sort_order,
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
    company_id: int | None,
    customer_id: int | None,
    manager: str | None,
    order_name: str | None,
    design_type_id: int | None,
    order_no: str | None,
    address: str | None,
    created_date_from: str | None,
    created_date_to: str | None,
    status: str | None,
    production_type: str | None,
    deadline_dt: str | None,
    proofreading_dt: str | None,
    note: str | None,
    sort_by: str | None,
    sort_order: str | None,
    page: int,
    per_page: int,
):
    offset = (page - 1) * per_page

    # 条件句の組み立て（プレースホルダは :name 形式）
    conditions = ["om.is_deleted = 0"]
    params = {"limit": per_page, "offset": offset}

    if company_id is not None:
        conditions.append("om.company_id = :company_id")
        params["company_id"] = company_id

    if customer_id is not None:
        conditions.append("om.customer_id = :customer_id")
        params["customer_id"] = customer_id

    if manager and manager.strip():
        conditions.append("om.manager_name LIKE :manager")
        params["manager"] = f"%{manager.strip()}%"  # 部分一致（担当者名）

    if order_name and order_name.strip():
        conditions.append("om.order_name LIKE :order_name")
        params["order_name"] = f"%{order_name.strip()}%"  # 部分一致

    if design_type_id is not None:
        conditions.append("om.design_type_id = :design_type_id")
        params["design_type_id"] = design_type_id

    if order_no and order_no.strip():
        conditions.append("om.order_no LIKE :order_no")
        params["order_no"] = f"%{order_no.strip()}%"

    if address and address.strip():
        conditions.append("om.order_add LIKE :address")
        params["address"] = f"%{address.strip()}%"  # 部分一致

    if created_date_from and created_date_from.strip():
        conditions.append("DATE(om.created_dt) >= :created_date_from")
        params["created_date_from"] = created_date_from.strip()

    if created_date_to and created_date_to.strip():
        conditions.append("DATE(om.created_dt) <= :created_date_to")
        params["created_date_to"] = created_date_to.strip()

    if status and status.strip():
        conditions.append("om.attribute_05 = :status")
        params["status"] = status.strip()

    if production_type and production_type.strip():
        conditions.append("om.attribute_04 = :production_type")
        params["production_type"] = production_type.strip()

    if deadline_dt and deadline_dt.strip():
        conditions.append("DATE(om.deadline_dt) = :deadline_dt")
        params["deadline_dt"] = deadline_dt.strip()

    if proofreading_dt and proofreading_dt.strip():
        conditions.append("DATE(om.proofreading_dt) = :proofreading_dt")
        params["proofreading_dt"] = proofreading_dt.strip()

    if note and note.strip():
        conditions.append("om.note LIKE :note")
        params["note"] = f"%{note.strip()}%"  # 部分一致

    where_clause = " AND ".join(conditions)

    # ORDER BY（sort_by: order_no / created_date、sort_order: asc / desc）
    order_col = "om.order_no" if (sort_by or "").strip().lower() == "order_no" else "om.created_dt"
    order_dir = "DESC" if (sort_order or "").strip().lower() == "desc" else "ASC"
    order_clause = f"ORDER BY {order_col} {order_dir}"

    # 枝番はサブクエリで取得（order_detail が無い場合は NULL → 空文字に変換して split）
    sql = f"""
        SELECT
            om.order_id,
            om.order_no,
            om.order_name,
            om.order_add,
            om.company_id,
            om.customer_id,
            om.template_id,
            om.design_type_id,
            om.deadline_dt,
            om.proofreading_dt,
            om.attribute_01 AS attribute_01,
            om.attribute_02 AS attribute_02,
            om.attribute_03 AS attribute_03,
            om.attribute_04 AS attribute_04,
            om.attribute_05 AS attribute_05,
            om.attribute_06 AS attribute_06,
            om.attribute_07 AS attribute_07,
            om.attribute_08 AS attribute_08,
            om.attribute_09 AS attribute_09,
            om.attribute_10 AS attribute_10,
            om.note,
            dt.design_type_name,
            om.created_dt,
            cus.customer_name,
            om.manager_name,
            t.template_name,
            u.user_name AS creator_name,
            (SELECT GROUP_CONCAT(od.branch_no ORDER BY od.branch_no)
             FROM order_detail od
             WHERE od.order_id = om.order_id AND od.is_deleted = 0) AS branches_str
        FROM order_main om
        LEFT JOIN customer cus ON om.customer_id = cus.customer_id AND cus.is_deleted = 0
        LEFT JOIN template t ON om.template_id = t.template_id AND t.is_deleted = 0
        LEFT JOIN design_type dt ON om.design_type_id = dt.design_type_id AND dt.is_deleted = 0
        LEFT JOIN `user` u ON om.created_by = u.user_id AND u.is_deleted = 0
        WHERE {where_clause}
        {order_clause}
        LIMIT :limit OFFSET :offset
    """

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM order_main om
        LEFT JOIN customer cus ON om.customer_id = cus.customer_id AND cus.is_deleted = 0
        LEFT JOIN template t ON om.template_id = t.template_id AND t.is_deleted = 0
        LEFT JOIN design_type dt ON om.design_type_id = dt.design_type_id AND dt.is_deleted = 0
        WHERE {where_clause}
    """

    # 総件数取得（LIMIT/OFFSET 用の params から除外）
    count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
    total_row = db.execute(text(count_sql), count_params).fetchone()
    total = total_row[0] if total_row else 0

    # 一覧取得
    rows = db.execute(text(sql), params).mappings().all()

    # 枝番ごとの design_data を取得（order_detail）
    order_ids = [r.get("order_id") for r in rows if r.get("order_id")]
    design_by_order: dict[int, dict[str, object]] = {}
    if order_ids:
        id_placeholders = ", ".join(str(i) for i in order_ids)
        detail_rows = db.execute(
            text(f"""
                SELECT order_id, branch_no, design_data, note
                FROM order_detail
                WHERE order_id IN ({id_placeholders}) AND is_deleted = 0
            """),
        ).mappings().all()
        note_by_order: dict[int, dict[str, str]] = {}
        for oid in order_ids:
            design_by_order[oid] = {}
            note_by_order[oid] = {}
        for d in detail_rows:
            oid = d.get("order_id")
            bn = d.get("branch_no")
            dd = d.get("design_data")
            note_val = d.get("note")
            if oid and bn is not None:
                if isinstance(dd, str):
                    try:
                        dd = json.loads(dd) if dd else None
                    except json.JSONDecodeError:
                        dd = None
                design_by_order[oid][str(bn)] = dd
                note_by_order[oid][str(bn)] = (note_val or "").strip() if note_val else ""

    # レスポンス形式に変換
    items = []
    for r in rows:
        branches_str = r.get("branches_str")
        branches = branches_str.split(",") if branches_str else []

        # created_dt を YYYY/MM/DD 形式に
        created_dt = r.get("created_dt")
        created_date = ""
        if created_dt:
            if hasattr(created_dt, "strftime"):
                created_date = created_dt.strftime("%Y/%m/%d")
            else:
                created_date = str(created_dt)[:10].replace("-", "/")

        deadline_dt = r.get("deadline_dt")
        proofreading_dt = r.get("proofreading_dt")
        deadline_str = ""
        if deadline_dt:
            if hasattr(deadline_dt, "strftime"):
                deadline_str = deadline_dt.strftime("%Y/%m/%d")
            else:
                deadline_str = str(deadline_dt)[:10].replace("-", "/")
        proofreading_str = ""
        if proofreading_dt:
            if hasattr(proofreading_dt, "strftime"):
                proofreading_str = proofreading_dt.strftime("%Y/%m/%d")
            else:
                proofreading_str = str(proofreading_dt)[:10].replace("-", "/")

        items.append({
            "orderId": r.get("order_id"),
            "orderNo": r.get("order_no", ""),
            "orderName": r.get("order_name", ""),
            "address": r.get("order_add", ""),
            "companyId": r.get("company_id"),
            "customerId": r.get("customer_id"),
            "customerName": r.get("customer_name") or "",
            "manager": r.get("manager_name") or "",  # om.manager_name
            "templateId": r.get("template_id"),
            "template": r.get("template_name") or "",
            "designTypeId": r.get("design_type_id"),
            "designType": r.get("design_type_name") or "",
            "deadlineDt": deadline_str,
            "proofreadingDt": proofreading_str,
            "attribute_01": (r.get("attribute_01") or r.get("om.attribute_01")) or "",
            "attribute_02": (r.get("attribute_02") or r.get("om.attribute_02")) or "",
            "attribute_03": (r.get("attribute_03") or r.get("om.attribute_03")) or "",
            "attribute_04": (r.get("attribute_04") or r.get("om.attribute_04")) or "",
            "attribute_05": (r.get("attribute_05") or r.get("om.attribute_05")) or "",
            "attribute_06": (r.get("attribute_06") or r.get("om.attribute_06")) or "",
            "attribute_07": (r.get("attribute_07") or r.get("om.attribute_07")) or "",
            "attribute_08": (r.get("attribute_08") or r.get("om.attribute_08")) or "",
            "attribute_09": (r.get("attribute_09") or r.get("om.attribute_09")) or "",
            "attribute_10": (r.get("attribute_10") or r.get("om.attribute_10")) or "",
            "note": r.get("note") or "",
            "createdDate": created_date,
            "creator": r.get("creator_name") or "",
            "branches": branches,
            "designDataByBranch": design_by_order.get(r.get("order_id"), {}),
            "noteByBranch": note_by_order.get(r.get("order_id"), {}),
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "perPage": per_page,
    }


# -----------------------------
# 注文1件取得（order_no 完全一致。order_item 含む）
# -----------------------------


@router.get("/by-no")
def get_order_by_no(
    db: Session = Depends(get_db),
    order_no: str = Query(..., description="注文番号（完全一致）"),
):
    """
    注文番号で1件取得。order_main と order_item を返す。
    テンプレート項目の値は orderItems に templateItemId と orderItemVal の配列で含まれる。
    """
    try:
        no = (order_no or "").strip()
        if not no:
            return JSONResponse(status_code=400, content={"detail": "注文番号を指定してください。"})
        row = db.execute(
            text("""
                SELECT
                    om.order_id,
                    om.order_no,
                    om.order_name,
                    om.order_add,
                    om.company_id,
                    om.customer_id,
                    om.template_id,
                    om.design_type_id,
                    om.deadline_dt,
                    om.proofreading_dt,
                    om.attribute_01,
                    om.attribute_02,
                    om.attribute_03,
                    om.attribute_04,
                    om.attribute_05,
                    om.note,
                    om.manager_name,
                    cus.customer_name,
                    t.template_name,
                    dt.design_type_name
                FROM order_main om
                LEFT JOIN customer cus ON om.customer_id = cus.customer_id AND cus.is_deleted = 0
                LEFT JOIN template t ON om.template_id = t.template_id AND t.is_deleted = 0
                LEFT JOIN design_type dt ON om.design_type_id = dt.design_type_id AND dt.is_deleted = 0
                WHERE om.order_no = :order_no AND om.is_deleted = 0
            """),
            {"order_no": no},
        ).mappings().fetchone()
        if not row:
            return JSONResponse(status_code=404, content={"detail": "該当する注文が見つかりませんでした。"})
        order_id = row["order_id"]
        item_rows = db.execute(
            text("""
                SELECT template_item_id, order_item_val
                FROM order_item
                WHERE order_id = :order_id AND is_deleted = 0
                ORDER BY template_item_id
            """),
            {"order_id": order_id},
        ).mappings().fetchall()
        order_items = [
            {"templateItemId": r["template_item_id"], "orderItemVal": r["order_item_val"] or ""}
            for r in item_rows
        ]
        deadline_dt = row.get("deadline_dt")
        proofreading_dt = row.get("proofreading_dt")
        deadline_str = ""
        if deadline_dt:
            if hasattr(deadline_dt, "strftime"):
                deadline_str = deadline_dt.strftime("%Y/%m/%d")
            else:
                deadline_str = str(deadline_dt)[:10].replace("-", "/")
        proofreading_str = ""
        if proofreading_dt:
            if hasattr(proofreading_dt, "strftime"):
                proofreading_str = proofreading_dt.strftime("%Y/%m/%d")
            else:
                proofreading_str = str(proofreading_dt)[:10].replace("-", "/")
        return {
            "orderId": order_id,
            "orderNo": row["order_no"],
            "orderName": row["order_name"] or "",
            "address": row["order_add"] or "",
            "companyId": row["company_id"],
            "customerId": row["customer_id"],
            "customerName": row["customer_name"] or "",
            "manager": row["manager_name"] or "",
            "templateId": row["template_id"],
            "templateName": row["template_name"] or "",
            "designTypeId": row["design_type_id"],
            "designTypeName": row["design_type_name"] or "",
            "deadlineDt": deadline_str,
            "proofreadingDt": proofreading_str,
            "attribute_01": row["attribute_01"] or "",
            "attribute_02": row["attribute_02"] or "",
            "attribute_03": row["attribute_03"] or "",
            "attribute_04": row["attribute_04"] or "",
            "attribute_05": row["attribute_05"] or "",
            "note": row["note"] or "",
            "orderItems": order_items,
        }
    except Exception as e:
        logger.exception("注文1件取得でエラー")
        return JSONResponse(
            status_code=500,
            content={"detail": "サーバーでエラーが発生しました。", "error": str(e)},
        )


# -----------------------------
# 注文詳細（枝番）の登録・更新
# -----------------------------


@router.patch("/by-no/details")
def update_order_details(
    db: Session = Depends(get_db),
    order_no: str = Query(..., description="注文番号（完全一致）"),
    branches: list[dict] = Body(..., embed=True, alias="branches"),
):
    """
    注文番号で指定した注文の order_detail（枝番毎の備考・design_data）を登録・更新する。

    リクエスト Body: { "branches": [ { "branchNo": "01", "note": "...", "designData": {...} }, ... ] }
    - branchNo: 枝番（必須）
    - note: 備考（任意）
    - designData: デザイン編集データ（任意。JSON オブジェクト）

    既存の order_detail 行があれば UPDATE、なければ INSERT。
    """
    try:
        no = (order_no or "").strip()
        if not no:
            return JSONResponse(status_code=400, content={"detail": "注文番号を指定してください。"})
        row = db.execute(
            text("SELECT order_id FROM order_main WHERE order_no = :order_no AND is_deleted = 0"),
            {"order_no": no},
        ).fetchone()
        if not row:
            return JSONResponse(status_code=404, content={"detail": "該当する注文が見つかりませんでした。"})
        order_id = row[0]
        user_id = DEFAULT_USER_ID

        for b in branches:
            bn = (b.get("branchNo") or "").strip()
            if not bn or len(bn) > 2:
                continue
            note_val = (b.get("note") or "").strip() or None
            dd = b.get("designData")
            dd_json = json.dumps(dd) if dd is not None else None

            existing = db.execute(
                text("""
                    SELECT order_detail_id FROM order_detail
                    WHERE order_id = :order_id AND branch_no = :branch_no AND is_deleted = 0
                """),
                {"order_id": order_id, "branch_no": bn},
            ).fetchone()

            if existing:
                db.execute(
                    text("""
                        UPDATE order_detail
                        SET note = :note, design_data = :design_data, updated_by = :updated_by
                        WHERE order_id = :order_id AND branch_no = :branch_no AND is_deleted = 0
                    """),
                    {
                        "order_id": order_id,
                        "branch_no": bn,
                        "note": note_val,
                        "design_data": dd_json,
                        "updated_by": user_id,
                    },
                )
            else:
                db.execute(
                    text("""
                        INSERT INTO order_detail
                        (order_id, branch_no, note, design_data, is_deleted, created_by, updated_by)
                        VALUES (:order_id, :branch_no, :note, :design_data, 0, :created_by, :updated_by)
                    """),
                    {
                        "order_id": order_id,
                        "branch_no": bn,
                        "note": note_val,
                        "design_data": dd_json,
                        "created_by": user_id,
                        "updated_by": user_id,
                    },
                )
        db.commit()
        return {"orderNo": no, "updated": True}
    except Exception as e:
        db.rollback()
        logger.exception("注文詳細の登録・更新でエラー")
        return JSONResponse(
            status_code=500,
            content={"detail": "注文詳細の登録に失敗しました。", "error": str(e)},
        )


# -----------------------------
# 注文登録
# -----------------------------


def _next_order_no(db: Session, company_id: int, user_id: int) -> str:
    """
    受注番号を採番する（order_no_seq に基づく）。

    - ログイン会社（company_id）とシステムの当年の order_no_seq を取得。
    - 取得できた場合: last_number + 1 で UPDATE。
    - 取得できない場合: last_number = 1 で新規 INSERT。
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
    # INSERT ... ON DUPLICATE KEY UPDATE で採番（競合安全）
    db.execute(
        text("""
            INSERT INTO order_no_seq (company_id, `year`, last_number, is_deleted, created_by, updated_by)
            VALUES (:company_id, :year, 1, 0, :created_by, :updated_by)
            ON DUPLICATE KEY UPDATE
                last_number = last_number + 1,
                updated_by = :updated_by
        """),
        {"company_id": company_id, "year": year, "created_by": user_id, "updated_by": user_id},
    )
    db.flush()
    # 採番後の last_number を取得
    r = db.execute(
        text("""
            SELECT last_number FROM order_no_seq
            WHERE company_id = :company_id AND `year` = :year AND is_deleted = 0
        """),
        {"company_id": company_id, "year": year},
    ).fetchone()
    next_no = r[0] if r else 1
    return f"{year:04d}{next_no:06d}"


@router.post("")
def create_order(
    db: Session = Depends(get_db),
    login_company_id: int = Body(..., embed=True, alias="loginCompanyId"),
    order_name: str = Body(..., embed=True, alias="orderName"),
    order_add: str = Body(..., embed=True, alias="orderAdd"),
    customer_id: int = Body(..., embed=True, alias="customerId"),
    template_id: int = Body(..., embed=True, alias="templateId"),
    design_type_id: int = Body(..., embed=True, alias="designTypeId"),
    attribute_01: str = Body(..., embed=True, alias="attribute01"),
    attribute_02: str = Body(..., embed=True, alias="attribute02"),
    attribute_03: str = Body(..., embed=True, alias="attribute03"),
    attribute_04: str = Body("", embed=True, alias="attribute04"),
    attribute_05: str = Body("", embed=True, alias="attribute05"),
    template_items: list[dict] = Body(..., embed=True, alias="templateItems"),
    manager_name: str | None = Body(None, embed=True, alias="managerName"),
    deadline_dt: str | None = Body(None, embed=True, alias="deadlineDt"),
    proofreading_dt: str | None = Body(None, embed=True, alias="proofreadingDt"),
    note: str | None = Body(None, embed=True, alias="note"),
):
    """
    注文を新規登録する。

    処理順:
    1. リクエストの customerId に紐づく顧客を取得し、company_id を取得（無い場合は 400）。
    2. order_no_seq で受注番号を採番（ログイン会社・当年。形式: 年4桁+連番6桁）。
    3. order_main に登録（会社・顧客・テンプレート・受注番号・受注名・住所・デザイン種別）。
    4. テンプレート項目ごとに order_item を登録（template_item_id と入力値を order_item_val に格納）。

    リクエスト Body（JSON）:
        loginCompanyId: ログイン会社ID（採番に使用）
        orderName: 受注名
        orderAdd: 受注住所
        customerId: 顧客ID（order_main.customer_id。顧客の company_id が order_main.company_id に使用される）
        templateId: テンプレートID
        designTypeId: デザイン種別ID
        attribute01: 社内CD（必須）
        attribute02: 事業所CD（必須）
        attribute03: 現場CD（必須）
        templateItems: [ { "templateItemId": number, "orderItemVal": string }, ... ]
            テンプレート項目ごとの ID と入力値。可変長。

    レスポンス: { "orderNo": str, "orderId": int }
    エラー: 400（顧客不在・社内CD/事業所CD/現場CD未入力）、500（DB エラー等）
    """
    try:
        user_id = DEFAULT_USER_ID
        # 社内CD・事業所CD・現場CDは必須
        a01 = (attribute_01 or "").strip()
        a02 = (attribute_02 or "").strip()
        a03 = (attribute_03 or "").strip()
        if not a01 or not a02 or not a03:
            return JSONResponse(
                status_code=400,
                content={"detail": "社内CD・事業所CD・現場CDはすべて必須です。"},
            )
        # 指定された顧客を取得（order_main.company_id / customer_id 用）。いなければ 400
        cust = db.execute(
            text("""
                SELECT customer_id, company_id FROM customer
                WHERE customer_id = :customer_id AND is_deleted = 0
            """),
            {"customer_id": customer_id},
        ).fetchone()
        if not cust:
            return JSONResponse(
                status_code=400,
                content={"detail": "指定された顧客が存在しません。"},
            )
        company_id = cust[1]

        # 受注番号を採番（ログイン会社・当年。order_no_seq に基づく）
        order_no = _next_order_no(db, login_company_id, user_id)

        # 日付は YYYY-MM-DD 形式で受け取り、DATETIME に格納（時刻は 00:00:00）
        deadline_val = None
        if deadline_dt and deadline_dt.strip():
            try:
                deadline_val = datetime.strptime(deadline_dt.strip()[:10], "%Y-%m-%d")
            except ValueError:
                pass
        proofreading_val = None
        if proofreading_dt and proofreading_dt.strip():
            try:
                proofreading_val = datetime.strptime(proofreading_dt.strip()[:10], "%Y-%m-%d")
            except ValueError:
                pass

        # order_main に登録（テンプレート項目以外。company_id＝顧客の会社、customer_id＝選択した顧客）
        db.execute(
            text("""
                INSERT INTO order_main
                (company_id, customer_id, template_id, order_no, order_name, order_add, design_type_id, manager_name, deadline_dt, proofreading_dt, attribute_01, attribute_02, attribute_03, attribute_04, attribute_05, note, is_deleted, created_by, updated_by)
                VALUES (:company_id, :customer_id, :template_id, :order_no, :order_name, :order_add, :design_type_id, :manager_name, :deadline_dt, :proofreading_dt, :attribute_01, :attribute_02, :attribute_03, :attribute_04, :attribute_05, :note, 0, :created_by, :updated_by)
            """),
            {
                "company_id": company_id,
                "customer_id": customer_id,
                "template_id": template_id,
                "order_no": order_no,
                "manager_name": (manager_name or "").strip() or None,
                "order_name": order_name.strip(),
                "order_add": order_add.strip(),
                "design_type_id": design_type_id,
                "deadline_dt": deadline_val,
                "proofreading_dt": proofreading_val,
                "attribute_01": a01[:256],
                "attribute_02": a02[:256],
                "attribute_03": a03[:256],
                "attribute_04": (attribute_04 or "").strip()[:256],
                "attribute_05": (attribute_05 or "").strip()[:256],
                "note": (note or "").strip() or None,
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
