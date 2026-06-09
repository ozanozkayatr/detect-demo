from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.athlete_profile import AthleteProfile
from app.models.user import User

def get_or_create_app_user(db: Session) -> User:
    user = db.scalar(select(User).order_by(User.id.asc()).limit(1))
    if user is not None:
        return user

    user = User(display_name="Mert Yilmaz", email=None, phone_number=None)
    db.add(user)
    db.flush()
    return user


def get_athlete_profile(db: Session, user: User) -> AthleteProfile | None:
    if user.athlete_profile is not None:
        return user.athlete_profile

    profile = db.scalar(
        select(AthleteProfile).where(AthleteProfile.user_id == user.id).limit(1)
    )
    if profile is not None:
        user.athlete_profile = profile
    return profile


def get_or_create_app_session(db: Session) -> tuple[User, AthleteProfile | None]:
    user = get_or_create_app_user(db)
    profile = get_athlete_profile(db, user)
    db.commit()
    db.refresh(user)
    if profile is not None:
        db.refresh(profile)
    return user, profile
