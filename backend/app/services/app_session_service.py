from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.athlete_profile import AthleteProfile
from app.models.user import User


@dataclass(slots=True)
class ClerkIdentity:
    clerk_user_id: str
    display_name: str
    email: str | None = None
    phone_number: str | None = None


def get_user_by_clerk_id(db: Session, clerk_user_id: str) -> User | None:
    return db.scalar(select(User).where(User.clerk_user_id == clerk_user_id).limit(1))


def upsert_user_from_clerk_identity(db: Session, identity: ClerkIdentity) -> User:
    user = get_user_by_clerk_id(db, identity.clerk_user_id)
    normalized_email = identity.email.strip().lower() if identity.email else None
    normalized_phone = identity.phone_number.strip() if identity.phone_number else None

    if user is None:
        user = User(
            clerk_user_id=identity.clerk_user_id,
            display_name=identity.display_name.strip(),
            email=normalized_email,
            phone_number=normalized_phone,
        )
        db.add(user)
        db.flush()
        return user

    user.display_name = identity.display_name.strip() or user.display_name
    user.email = normalized_email
    user.phone_number = normalized_phone
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
