from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.app_session import AppSessionRead
from app.services.app_session_service import get_athlete_profile

router = APIRouter()


@router.get("/session", response_model=AppSessionRead)
def read_app_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppSessionRead:
    athlete_profile = get_athlete_profile(db, current_user)
    return AppSessionRead(user=current_user, athlete_profile=athlete_profile)
