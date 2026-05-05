from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PromptTemplateCreate(BaseModel):
    key: str
    title: str
    description: str | None = None
    prompt_body: str
    output_type: str
    is_active: bool = True


class PromptTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    title: str
    description: str | None
    prompt_body: str
    output_type: str
    is_active: bool
    created_at: datetime


class PromptFileRead(BaseModel):
    filename: str
    relative_path: str
    extension: str

