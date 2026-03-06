"""
Companyテーブルの疎通確認用ルーター。

目的：
- DB接続が正しいこと
- SQLが通ること
- FastAPI → DB → レスポンス の一連が動くこと
を最小のAPIで確認する。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db


router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("")
def list_companies(db: Session = Depends(get_db)):
    """
    companyテーブルの一覧を返す（疎通確認用）。

    ORMモデルを使う前段階として、
    まずはSQLを直接叩いて「接続が通っている」ことを確実にする。
    """
    rows = (
        db.execute(
            text("SELECT * FROM company WHERE is_deleted = 0 ORDER BY company_id")
        )
        .mappings()   # dict形式で返す
        .all()
    )
    return rows