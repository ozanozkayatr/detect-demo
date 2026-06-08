from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AthleteProfileBase(BaseModel):
    name: str
    age_range: str = ""
    stance: str = "orthodox"
    height_cm: int | None = None
    weight_kg: int | None = None
    experience_level: str = "beginner"
    years_boxing: int | None = None
    weekly_training_days: int | None = None
    training_types: list[str] = []
    routine_summary: str = ""
    has_amateur_bouts: bool = False
    has_professional_experience: bool = False
    has_coaching_experience: bool = False
    limitations: str = ""
    additional_context: str = ""


class AthleteProfileUpsert(AthleteProfileBase):
    pass


class AthleteProfileRead(AthleteProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
