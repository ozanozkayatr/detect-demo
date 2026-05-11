from __future__ import annotations

import json
from dataclasses import dataclass

from app.core.config import settings


@dataclass(slots=True)
class PersonaProfile:
    key: str
    title: str
    height_cm: int
    weight_kg: int
    sports_routine: str
    boxing_background: str


class PersonaConfigurationError(Exception):
    pass


def personas_file_path():
    return settings.prompts_dir / "personas" / "personas.json"


def load_personas() -> list[PersonaProfile]:
    personas_path = personas_file_path()

    if not personas_path.exists():
        raise PersonaConfigurationError(
            f"Persona seed file was not found: {personas_path}"
        )

    try:
        payload = json.loads(personas_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PersonaConfigurationError(
            f"Persona seed file is not valid JSON: {personas_path}"
        ) from exc

    personas: list[PersonaProfile] = []
    for item in payload:
        personas.append(
            PersonaProfile(
                key=str(item["key"]).strip(),
                title=str(item["title"]).strip(),
                height_cm=int(item["height_cm"]),
                weight_kg=int(item["weight_kg"]),
                sports_routine=str(item["sports_routine"]).strip(),
                boxing_background=str(item["boxing_background"]).strip(),
            )
        )

    return personas


def get_persona_by_key(persona_key: str) -> PersonaProfile | None:
    normalized_key = persona_key.strip().lower()
    for persona in load_personas():
        if persona.key.strip().lower() == normalized_key:
            return persona
    return None
