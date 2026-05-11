from __future__ import annotations

from pydantic import BaseModel


class GeminiModelOption(BaseModel):
    value: str
    display_name: str
    description: str | None = None
    input_token_limit: int | None = None
    output_token_limit: int | None = None


class GeminiModelListResponse(BaseModel):
    configured_model: str
    models: list[GeminiModelOption]
