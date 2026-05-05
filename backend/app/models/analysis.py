from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id"))
    prompt_template_id: Mapped[int] = mapped_column(ForeignKey("prompt_templates.id"))
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_response: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    parser_strategy: Mapped[str | None] = mapped_column(String(50), nullable=True)
    json_parse_succeeded: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    template_key_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)
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

    video = relationship("Video", back_populates="analyses")
    prompt_template = relationship("PromptTemplate", back_populates="analyses")
