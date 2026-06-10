from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.athlete_profile import AthleteProfile
from app.models.user import User
from app.schemas.athlete_profile import AthleteProfileRead, AthleteProfileUpsert
from app.services.app_session_service import get_athlete_profile

router = APIRouter()


@router.get("", response_model=AthleteProfileRead)
def read_athlete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AthleteProfileRead:
    athlete_profile = get_athlete_profile(db, current_user)
    if athlete_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "athlete_profile_not_found",
                "message": "No athlete profile has been created yet.",
            },
        )
    return athlete_profile


@router.put("", response_model=AthleteProfileRead)
def upsert_athlete_profile(
    payload: AthleteProfileUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AthleteProfileRead:
    athlete_profile = get_athlete_profile(db, current_user)
    if athlete_profile is None:
        athlete_profile = AthleteProfile(user_id=current_user.id, name="")
        db.add(athlete_profile)
        db.flush()
        current_user.athlete_profile = athlete_profile

    athlete_profile.name = payload.name.strip()
    athlete_profile.age_range = payload.age_range.strip()
    athlete_profile.stance = payload.stance.strip()
    athlete_profile.height_cm = payload.height_cm
    athlete_profile.weight_kg = payload.weight_kg
    athlete_profile.experience_level = payload.experience_level.strip()
    athlete_profile.years_boxing = payload.years_boxing
    athlete_profile.weekly_training_days = payload.weekly_training_days
    athlete_profile.training_types = payload.training_types
    athlete_profile.routine_summary = payload.routine_summary.strip()
    athlete_profile.has_amateur_bouts = payload.has_amateur_bouts
    athlete_profile.has_professional_experience = (
        payload.has_professional_experience
    )
    athlete_profile.has_coaching_experience = payload.has_coaching_experience
    athlete_profile.limitations = payload.limitations.strip()
    athlete_profile.additional_context = payload.additional_context.strip()

    db.add(athlete_profile)
    db.commit()
    db.refresh(athlete_profile)
    return athlete_profile
