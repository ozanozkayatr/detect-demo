from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PromptTemplateBase(BaseModel):
    key: str
    title: str
    description: str | None = None
    prompt_body: str
    output_type: str
    is_active: bool = True

class PromptTemplateCreate(PromptTemplateBase):
    pass


class PromptTemplateSeed(PromptTemplateBase):
    pass


class PromptTemplateSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    title: str
    description: str | None
    output_type: str
    is_active: bool


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


class PromptTemplateSyncRead(BaseModel):
    created_count: int
    updated_count: int
    synced_count: int
    templates: list[PromptTemplateRead]
