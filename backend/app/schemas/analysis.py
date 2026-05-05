from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AnalysisCreate(BaseModel):
    video_id: int
    prompt_template_id: int
    status: str = "pending"
    model_name: str | None = None


class AnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    video_id: int
    prompt_template_id: int
    status: str
    raw_response: str | None
    parsed_response: dict[str, Any] | None
    model_name: str | None
    confidence: float | None
    created_at: datetime

