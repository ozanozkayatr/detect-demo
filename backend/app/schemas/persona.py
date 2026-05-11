from __future__ import annotations

from pydantic import BaseModel


class PersonaRead(BaseModel):
    key: str
    title: str
    height_cm: int
    weight_kg: int
    sports_routine: str
    boxing_background: str
