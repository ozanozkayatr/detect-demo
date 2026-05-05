from __future__ import annotations

import json

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import PromptTemplateSeed

PROMPT_EXTENSIONS = {".md", ".txt", ".json"}
SYNCABLE_PROMPT_EXTENSIONS = {".json"}


def list_prompt_files() -> list[dict[str, str]]:
    prompt_templates_dir = settings.prompts_dir / "templates"

    if not prompt_templates_dir.exists():
        return []

    files: list[dict[str, str]] = []

    for path in sorted(prompt_templates_dir.rglob("*")):
        if not path.is_file() or path.suffix not in PROMPT_EXTENSIONS:
            continue
        if path.stem.lower() == "readme":
            continue

        files.append(
            {
                "filename": path.name,
                "relative_path": str(path.relative_to(settings.prompts_dir)),
                "extension": path.suffix,
            }
        )

    return files


def load_prompt_template_seeds() -> list[PromptTemplateSeed]:
    prompt_templates_dir = settings.prompts_dir / "templates"

    if not prompt_templates_dir.exists():
        return []

    seeds: list[PromptTemplateSeed] = []

    for path in sorted(prompt_templates_dir.rglob("*")):
        if not path.is_file() or path.suffix not in SYNCABLE_PROMPT_EXTENSIONS:
            continue
        if path.stem.lower() == "readme":
            continue

        payload = json.loads(path.read_text(encoding="utf-8"))

        try:
            seeds.append(PromptTemplateSeed.model_validate(payload))
        except ValidationError as exc:
            raise ValueError(f"Invalid prompt template file: {path}") from exc

    return seeds


def sync_prompt_templates(db: Session) -> tuple[int, int, list[PromptTemplate]]:
    seeds = load_prompt_template_seeds()

    if not seeds:
        return 0, 0, []

    existing_templates = {
        template.key: template
        for template in db.scalars(select(PromptTemplate)).all()
    }

    created_count = 0
    updated_count = 0
    synced_templates: list[PromptTemplate] = []

    for seed in seeds:
        template = existing_templates.get(seed.key)

        if template is None:
            template = PromptTemplate(**seed.model_dump())
            db.add(template)
            existing_templates[template.key] = template
            created_count += 1
        else:
            template_data = seed.model_dump()
            changed = False

            for field_name, value in template_data.items():
                if getattr(template, field_name) != value:
                    setattr(template, field_name, value)
                    changed = True

            if changed:
                updated_count += 1

        synced_templates.append(template)

    db.commit()

    refreshed_templates: list[PromptTemplate] = []
    for template in synced_templates:
        db.refresh(template)
        refreshed_templates.append(template)

    refreshed_templates.sort(key=lambda template: template.key)
    return created_count, updated_count, refreshed_templates
