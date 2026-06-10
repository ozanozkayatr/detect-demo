from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.errors import api_error
from app.core.config import settings
from app.models.user import User
from app.schemas.gemini import GeminiModelListResponse, GeminiModelOption
from app.services.gemini_service import (
    GeminiConfigurationError,
    GeminiExecutionError,
    list_accessible_gemini_models,
)

router = APIRouter()


@router.get("/models", response_model=GeminiModelListResponse)
def list_models(_: User = Depends(get_current_user)) -> GeminiModelListResponse:
    try:
        model_choices = list_accessible_gemini_models()
    except GeminiConfigurationError as exc:
        raise api_error(
            status_code=503,
            code="gemini_not_configured",
            message=str(exc),
        )
    except GeminiExecutionError as exc:
        raise api_error(
            status_code=502,
            code="gemini_model_listing_failed",
            message=str(exc),
        )

    return GeminiModelListResponse(
        configured_model=settings.gemini_model,
        models=[
            GeminiModelOption(
                value=model_choice.value,
                display_name=model_choice.display_name,
                description=model_choice.description,
                input_token_limit=model_choice.input_token_limit,
                output_token_limit=model_choice.output_token_limit,
            )
            for model_choice in model_choices
        ],
    )
