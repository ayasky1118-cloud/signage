"""
会社一覧API。

Companyテーブルの一覧を返す。DB疎通確認用に設計された最小実装のため、
ORMモデルを使わずSQLを直接実行する。注文フォーム等の会社選択にも利用される。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("")
def list_companies(db: Session = Depends(get_db)):
    """
    companyテーブルの一覧を返す（削除済みを除く）。
    """
    rows = (
        db.execute(
            text("SELECT * FROM company WHERE is_deleted = 0 ORDER BY company_id")
        )
        .mappings()   # dict形式で返す
        .all()
    )
    return rows