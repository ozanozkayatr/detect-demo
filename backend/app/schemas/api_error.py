from __future__ import annotations

from pydantic import BaseModel


class ApiErrorDetail(BaseModel):
    code: str
    message: str
    analysis_id: int | None = None


class ApiErrorResponse(BaseModel):
    detail: ApiErrorDetail
