from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MappingMetadata(Base):
    __tablename__ = "mapping_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mapping_type: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, default="online")
    source_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

