from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.prompt_template import PromptTemplateSummary
from app.schemas.video import VideoRead


class AnalysisCreate(BaseModel):
    video_id: int
    prompt_template_id: int


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
    updated_at: datetime
    video: VideoRead
    prompt_template: PromptTemplateSummary
