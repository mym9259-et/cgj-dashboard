from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StoreMapping(Base):
    __tablename__ = "store_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    merchant_name: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    lingpao_region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_lingpao: Mapped[str | None] = mapped_column(String(20), nullable=True)
    store_manager: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
