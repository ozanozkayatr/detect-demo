from __future__ import annotations

from fastapi import HTTPException

from app.schemas.api_error import ApiErrorDetail


def api_error(
    *,
    status_code: int,
    code: str,
    message: str,
    analysis_id: int | None = None,
) -> HTTPException:
    detail = ApiErrorDetail(
        code=code,
        message=message,
        analysis_id=analysis_id,
    )
    return HTTPException(status_code=status_code, detail=detail.model_dump())
