from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime

from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    filename = Column(String, nullable=False)

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

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )