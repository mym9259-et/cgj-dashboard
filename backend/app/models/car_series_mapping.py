from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CarSeriesMapping(Base):
    __tablename__ = "car_series_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raw_series: Mapped[str] = mapped_column(String(500), nullable=False, comment="\u539f\u59cb\u8f66\u7cfb\u540d\u79f0")
    clean_series: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="\u6e05\u6d17\u540e\u7684\u6807\u51c6\u8f66\u7cfb\u540d\u79f0")
    brand: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="\u5173\u8054\u54c1\u724c")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
