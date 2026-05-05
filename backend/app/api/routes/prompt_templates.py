from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import (
    PromptFileRead,
    PromptTemplateCreate,
    PromptTemplateRead,
)
from app.services.prompt_loader import list_prompt_files

router = APIRouter()


@router.get("", response_model=list[PromptTemplateRead])
def list_prompt_templates(db: Session = Depends(get_db)) -> list[PromptTemplate]:
    statement = select(PromptTemplate).order_by(PromptTemplate.created_at.desc())
    return list(db.scalars(statement))


@router.get("/files", response_model=list[PromptFileRead])
def list_prompt_template_files() -> list[PromptFileRead]:
    return [PromptFileRead.model_validate(file_info) for file_info in list_prompt_files()]


@router.post("", response_model=PromptTemplateRead, status_code=201)
def create_prompt_template(
    payload: PromptTemplateCreate,
    db: Session = Depends(get_db),
) -> PromptTemplate:
    prompt_template = PromptTemplate(**payload.model_dump())
    db.add(prompt_template)
    db.commit()
    db.refresh(prompt_template)
    return prompt_template

