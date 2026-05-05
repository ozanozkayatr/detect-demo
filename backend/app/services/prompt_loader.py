from __future__ import annotations

from pathlib import Path

from app.core.config import settings

PROMPT_EXTENSIONS = {".md", ".txt", ".json"}


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
