from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    prompts_dir: str
    upload_dir: str
    gemini_configured: bool
    gemini_model: str
    error: str | None = None
