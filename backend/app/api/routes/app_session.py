from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.app_session import AppSessionRead
from app.services.app_session_service import get_or_create_app_session

router = APIRouter()


@router.get("/session", response_model=AppSessionRead)
def read_app_session(db: Session = Depends(get_db)) -> AppSessionRead:
    user, athlete_profile = get_or_create_app_session(db)
    return AppSessionRead(user=user, athlete_profile=athlete_profile)
