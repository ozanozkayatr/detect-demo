from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    age_range: Mapped[str] = mapped_column(String(50), default="")
    stance: Mapped[str] = mapped_column(String(50), default="orthodox")
    height_cm: Mapped[int | None] = mapped_column(nullable=True)
    weight_kg: Mapped[int | None] = mapped_column(nullable=True)
    experience_level: Mapped[str] = mapped_column(String(100), default="beginner")
    years_boxing: Mapped[int | None] = mapped_column(nullable=True)
    weekly_training_days: Mapped[int | None] = mapped_column(nullable=True)
    training_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    routine_summary: Mapped[str] = mapped_column(Text, default="")
    has_amateur_bouts: Mapped[bool] = mapped_column(Boolean, default=False)
    has_professional_experience: Mapped[bool] = mapped_column(Boolean, default=False)
    has_coaching_experience: Mapped[bool] = mapped_column(Boolean, default=False)
    limitations: Mapped[str] = mapped_column(Text, default="")
    additional_context: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
    )

    user = relationship("User", back_populates="athlete_profile")
