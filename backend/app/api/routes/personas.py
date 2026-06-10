from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.errors import api_error
from app.models.user import User
from app.schemas.persona import PersonaRead
from app.services.persona_loader import (
    PersonaConfigurationError,
    load_personas,
)

router = APIRouter()


@router.get("", response_model=list[PersonaRead])
def list_personas(_: User = Depends(get_current_user)) -> list[PersonaRead]:
    try:
        personas = load_personas()
    except PersonaConfigurationError as exc:
        raise api_error(
            status_code=500,
            code="persona_configuration_error",
            message=str(exc),
        )

    return [
        PersonaRead(
            key=persona.key,
            title=persona.title,
            height_cm=persona.height_cm,
            weight_kg=persona.weight_kg,
            sports_routine=persona.sports_routine,
            boxing_background=persona.boxing_background,
        )
        for persona in personas
    ]
