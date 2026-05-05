from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    prompts_dir: str
    upload_dir: str
    error: str | None = None

