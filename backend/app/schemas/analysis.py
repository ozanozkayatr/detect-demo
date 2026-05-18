from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.prompt_template import PromptTemplateSummary
from app.schemas.video import VideoRead


class AnalysisCreate(BaseModel):
    video_id: int
    prompt_template_id: int
    persona_key: str
    model_name: str | None = None
    user_prompt: str | None = Field(default=None, max_length=1200)


class ParsedAnalysisResponse(BaseModel):
    summary: str = ""
    strengths: list[str] = []
    issues: list[str] = []
    next_steps: list[str] = []
    notes: list[str] = []


class AnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    video_id: int
    prompt_template_id: int
    status: str
    raw_response: str | None
    parsed_response: ParsedAnalysisResponse | None
    model_name: str | None
    confidence: float | None
    parser_strategy: str | None
    json_parse_succeeded: bool | None
    template_key_snapshot: str | None
    persona_key_snapshot: str | None
    user_prompt_snapshot: str | None
    created_at: datetime
    updated_at: datetime
    video: VideoRead
    prompt_template: PromptTemplateSummary
