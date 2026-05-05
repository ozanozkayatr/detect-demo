from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    database_status = "unavailable"
    error: str | None = None

    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception as exc:  # pragma: no cover - defensive status response
        error = str(exc)

    return HealthResponse(
        status="ok",
        service="backend",
        database=database_status,
        prompts_dir=str(settings.prompts_dir),
        upload_dir=str(settings.upload_dir),
        gemini_configured=settings.gemini_configured,
        gemini_model=settings.gemini_model,
        error=error,
    )
