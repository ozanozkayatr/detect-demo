from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.athlete_profile import AthleteProfile
from app.models.user import User


def build_default_athlete_profile(user_id: int) -> AthleteProfile:
    return AthleteProfile(
        user_id=user_id,
        name="Mert Yilmaz",
        age_range="25–34",
        stance="orthodox",
        height_cm=181,
        weight_kg=76,
        experience_level="advanced_amateur",
        years_boxing=6,
        weekly_training_days=5,
        training_types=["bag_work", "pads", "sparring", "strength", "conditioning"],
        routine_summary=(
            "Five sessions per week split between technical bag work, pads, "
            "light sparring, and strength conditioning."
        ),
        has_amateur_bouts=True,
        has_professional_experience=False,
        has_coaching_experience=False,
        limitations="",
        additional_context=(
            "Advanced amateur athlete profile with steady technical training "
            "volume and regular sparring."
        ),
    )


def get_or_create_app_user(db: Session) -> User:
    user = db.scalar(select(User).order_by(User.id.asc()).limit(1))
    if user is not None:
        return user

    user = User(display_name="Mert Yilmaz", email=None, phone_number=None)
    db.add(user)
    db.flush()
    return user


def get_or_create_athlete_profile(db: Session, user: User) -> AthleteProfile:
    if user.athlete_profile is not None:
        return user.athlete_profile

    profile = db.scalar(
        select(AthleteProfile).where(AthleteProfile.user_id == user.id).limit(1)
    )
    if profile is not None:
        user.athlete_profile = profile
        return profile

    profile = build_default_athlete_profile(user.id)
    db.add(profile)
    db.flush()
    user.athlete_profile = profile
    return profile


def get_or_create_app_session(db: Session) -> tuple[User, AthleteProfile]:
    user = get_or_create_app_user(db)
    profile = get_or_create_athlete_profile(db, user)
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return user, profile
