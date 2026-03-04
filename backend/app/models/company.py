"""
会社情報テーブル（company）

DDLを正としてORMモデルを定義。
・論理削除フラグあり
・監査カラムあり（created/updated）
"""

from sqlalchemy import (
    BigInteger,
    String,
    Boolean,
    DateTime,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Company(Base):
    """
    会社情報
    """
    __tablename__ = "company"
    __table_args__ = {
        "comment": "会社情報",
    }

    # =============================
    # 主キー
    # =============================
    company_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="会社ID",
    )

    # =============================
    # 基本情報
    # =============================
    company_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        comment="会社コード",
    )

    company_name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="会社名",
    )

    company_post: Mapped[str | None] = mapped_column(
        String(7),
        nullable=True,
        comment="郵便番号",
    )

    company_add: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
        comment="住所",
    )

    company_tel: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="電話番号",
    )

    company_fax: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="FAX番号",
    )

    # =============================
    # 論理削除フラグ
    # =============================
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("0"),
        comment="削除フラグ",
    )

    # =============================
    # 監査カラム
	# DDL通り：デフォルトはDB、更新はアプリが明示的に値を入れる
    # =============================
    created_dt: Mapped[str] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        comment="作成日時",
    )

    created_by: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="作成者",
    )

    updated_dt: Mapped[str] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
        comment="更新日時",
    )

    updated_by: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="更新者",
    )