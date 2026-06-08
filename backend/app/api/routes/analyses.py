from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.errors import api_error
from app.core.config import settings
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.prompt_template import PromptTemplate
from app.models.video import Video
from app.schemas.analysis import AnalysisCreate, AnalysisRead
from app.services.gemini_service import (
    GeminiConfigurationError,
    GeminiExecutionError,
    run_gemini_video_analysis,
)
from app.services.analysis_parser import note_only_response
from app.services.persona_loader import (
    PersonaConfigurationError,
    get_persona_by_key,
)

router = APIRouter()


def analysis_query():
    return select(Analysis).options(
        selectinload(Analysis.video),
        selectinload(Analysis.prompt_template),
    )


@router.get("", response_model=list[AnalysisRead])
def list_analyses(db: Session = Depends(get_db)) -> list[Analysis]:
    statement = analysis_query().order_by(Analysis.created_at.desc())
    return list(db.scalars(statement))


@router.get("/{analysis_id}", response_model=AnalysisRead)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)) -> Analysis:
    statement = analysis_query().where(Analysis.id == analysis_id)
    analysis = db.scalars(statement).first()

    if analysis is None:
        raise api_error(
            status_code=404,
            code="analysis_not_found",
            message="Analysis not found.",
        )

    return analysis


@router.post("", response_model=AnalysisRead, status_code=201)
def create_analysis(
    payload: AnalysisCreate,
    db: Session = Depends(get_db),
) -> Analysis:
    video = db.get(Video, payload.video_id)
    prompt_template = db.get(PromptTemplate, payload.prompt_template_id)
    normalized_user_prompt = (
        payload.user_prompt.strip() if payload.user_prompt else None
    ) or None
    try:
        persona = get_persona_by_key(payload.persona_key)
    except PersonaConfigurationError as exc:
        raise api_error(
            status_code=500,
            code="persona_configuration_error",
            message=str(exc),
        )

    if video is None:
        raise api_error(
            status_code=404,
            code="video_not_found",
            message="Video not found.",
        )

    if prompt_template is None:
        raise api_error(
            status_code=404,
            code="prompt_template_not_found",
            message="Prompt template not found.",
        )

    if persona is None:
        raise api_error(
            status_code=404,
            code="persona_not_found",
            message="Persona not found.",
        )

    selected_model_name = (payload.model_name or settings.gemini_model).strip()

    analysis = Analysis(
        video_id=payload.video_id,
        prompt_template_id=payload.prompt_template_id,
        status="running",
        raw_response=None,
        parsed_response=None,
        model_name=selected_model_name if settings.gemini_configured else None,
        confidence=None,
        parser_strategy=None,
        json_parse_succeeded=None,
        template_key_snapshot=prompt_template.key,
        persona_key_snapshot=persona.key,
        user_prompt_snapshot=normalized_user_prompt,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    try:
        result = run_gemini_video_analysis(
            video=video,
            prompt_template=prompt_template,
            persona=persona,
            user_prompt=normalized_user_prompt,
            model_name=selected_model_name,
        )
        analysis.status = "completed"
        analysis.raw_response = result.raw_response
        analysis.parsed_response = result.parsed_response
        analysis.model_name = result.model_name
        analysis.confidence = result.confidence
        analysis.parser_strategy = result.parser_strategy
        analysis.json_parse_succeeded = result.json_parse_succeeded
        analysis.template_key_snapshot = result.template_key_snapshot
        analysis.persona_key_snapshot = persona.key
        analysis.user_prompt_snapshot = normalized_user_prompt
        db.commit()
    except GeminiConfigurationError as exc:
        analysis.status = "failed"
        analysis.raw_response = None
        analysis.parsed_response = note_only_response(str(exc))
        analysis.parser_strategy = "not_run"
        analysis.json_parse_succeeded = False
        db.commit()
        raise api_error(
            status_code=503,
            code="gemini_not_configured",
            message=str(exc),
            analysis_id=analysis.id,
        )
    except GeminiExecutionError as exc:
        analysis.status = "failed"
        analysis.raw_response = None
        analysis.parsed_response = note_only_response(str(exc))
        analysis.parser_strategy = "execution_error"
        analysis.json_parse_succeeded = False
        db.commit()
        raise api_error(
            status_code=502,
            code="gemini_request_failed",
            message=str(exc),
            analysis_id=analysis.id,
        )

    statement = analysis_query().where(Analysis.id == analysis.id)
    return db.scalars(statement).one()
