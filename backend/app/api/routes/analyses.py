from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.prompt_template import PromptTemplate
from app.models.video import Video
from app.schemas.analysis import AnalysisCreate, AnalysisRead

router = APIRouter()


@router.get("", response_model=list[AnalysisRead])
def list_analyses(db: Session = Depends(get_db)) -> list[Analysis]:
    statement = select(Analysis).order_by(Analysis.created_at.desc())
    return list(db.scalars(statement))


@router.post("", response_model=AnalysisRead, status_code=201)
def create_analysis(
    payload: AnalysisCreate,
    db: Session = Depends(get_db),
) -> Analysis:
    video = db.get(Video, payload.video_id)
    prompt_template = db.get(PromptTemplate, payload.prompt_template_id)

    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found.",
        )

    if prompt_template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt template not found.",
        )

    analysis = Analysis(
        video_id=payload.video_id,
        prompt_template_id=payload.prompt_template_id,
        status=payload.status,
        model_name=payload.model_name,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis

