"""
HTMLオブジェクトマスタAPI。

全社共通の html_object および html_object_value 一覧を返す。
看板編集の全画面サイドバー（ルート描画・テキスト配置・画像配置・吹き出し配置等）で利用。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/html-objects", tags=["html-objects"])


@router.get("")
def list_html_objects(db: Session = Depends(get_db)):
    """
    HTMLオブジェクト一覧を返す（子の値マスタ含む）。
    全社共通マスタのため company_id は不要。
    """
    sql_objects = text("""
        SELECT html_object_id, category_code, category_name, html_object_type, has_child_table, display_order
        FROM html_object
        WHERE is_deleted = 0
        ORDER BY display_order, html_object_id
    """)
    rows = db.execute(sql_objects).mappings().all()

    result = []
    for r in rows:
        obj = {
            "htmlObjectId": r["html_object_id"],
            "categoryCode": r["category_code"],
            "categoryName": r["category_name"],
            "htmlObjectType": r["html_object_type"],
            "hasChildTable": bool(r["has_child_table"]),  # 子テーブル html_object_value を持つ場合 true
            "displayOrder": r["display_order"],
            "values": [],
        }
        # has_child_table が true の場合、選択肢（ドロップダウンなど）を html_object_value から取得
        if r["has_child_table"]:
            sql_values = text("""
                SELECT html_object_value_id, value_code, value_name, value_data, sample_image_path, display_order
                FROM html_object_value
                WHERE html_object_id = :html_object_id AND is_deleted = 0
                ORDER BY display_order, html_object_value_id
            """)
            val_rows = db.execute(sql_values, {"html_object_id": r["html_object_id"]}).mappings().all()
            obj["values"] = [
                {
                    "htmlObjectValueId": v["html_object_value_id"],
                    "valueCode": v["value_code"],
                    "valueName": v["value_name"],
                    "valueData": v["value_data"],  # 選択肢ごとの設定（JSON 等。例: ルート色・線種）
                    "sampleImagePath": v["sample_image_path"],
                    "displayOrder": v["display_order"],
                }
                for v in val_rows
            ]
        result.append(obj)
    return result
