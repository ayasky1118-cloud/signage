"""
SQLAlchemyのORMモデルが継承する基底クラスを定義。

ここを経由することで、
・Alembicの自動マイグレーション
・Base.metadata.create_all()
が正しく機能する。
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    すべてのORMモデルはこのクラスを継承する。
    """
    pass