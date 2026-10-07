from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime
from zoneinfo import ZoneInfo

from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    filename = Column(
        String,
        nullable=False
    )

    file_type = Column(
        String,
        nullable=True
    )

    status = Column(
        String,
        default="uploaded"
    )

    risk_score = Column(
        Float,
        default=0
    )

    risk_level = Column(
        String,
        default="Low"
    )

    validation_result = Column(
        Text,
        nullable=True
    )

    ai_explanation = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(
            ZoneInfo("Asia/Kolkata")
        )
    )