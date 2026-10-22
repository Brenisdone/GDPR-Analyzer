from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from api.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    target: Mapped[str] = mapped_column(
        String(2048), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20), default="running", nullable=False
    )

    grade: Mapped[Optional[str]] = mapped_column(
        String(2), nullable=True
    )

    result: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )

    error: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )