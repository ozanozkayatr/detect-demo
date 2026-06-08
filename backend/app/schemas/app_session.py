from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.athlete_profile import AthleteProfileRead


class AppUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    email: str | None
    phone_number: str | None
    created_at: datetime
    updated_at: datetime


class AppSessionRead(BaseModel):
    user: AppUserRead
    athlete_profile: AthleteProfileRead
