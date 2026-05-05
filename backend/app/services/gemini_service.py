from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from google import genai

from app.core.config import settings
from app.models.prompt_template import PromptTemplate
from app.models.video import Video
from app.services.analysis_parser import parse_analysis_response

VIDEO_POLL_INTERVAL_SECONDS = 5
VIDEO_PROCESSING_TIMEOUT_SECONDS = 180


class GeminiConfigurationError(Exception):
    pass


class GeminiExecutionError(Exception):
    pass


@dataclass(slots=True)
class GeminiAnalysisResult:
    raw_response: str
    parsed_response: dict[str, object]
    model_name: str
    confidence: float | None


def build_analysis_instruction(prompt_template: PromptTemplate) -> str:
    base_instruction = prompt_template.prompt_body.strip()

    if prompt_template.output_type.lower() == "json":
        format_instruction = (
            "Return a JSON object with these keys: "
            "summary, strengths, issues, next_steps, notes. "
            "Use arrays for strengths, issues, next_steps, and notes."
        )
    else:
        format_instruction = (
            "Return the result in five labeled sections exactly named: "
            "Summary, Strengths, Issues, Next Steps, and Notes. "
            "Use bullets where useful."
        )

    return "\n\n".join(
        [
            "You are analyzing an uploaded boxing video.",
            "Use the following prompt template as the main instruction:",
            base_instruction,
            format_instruction,
            "Stay grounded in what is visible or clearly inferable from the video.",
        ]
    )


def extract_response_text(response: Any) -> str:
    direct_text = getattr(response, "text", None)
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    text_parts: list[str] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                text_parts.append(str(part_text).strip())

    if text_parts:
        return "\n\n".join(part for part in text_parts if part)

    if hasattr(response, "model_dump"):
        return json.dumps(response.model_dump(mode="json"), indent=2)

    return ""


def wait_for_video_processing(client: genai.Client, uploaded_file: Any) -> Any:
    deadline = time.monotonic() + VIDEO_PROCESSING_TIMEOUT_SECONDS
    current_file = uploaded_file

    while True:
        state = getattr(current_file, "state", None)
        state_name = getattr(state, "name", None) or (str(state) if state else "")
        normalized_state = state_name.upper()

        if not normalized_state or normalized_state.endswith("ACTIVE"):
            return current_file

        if normalized_state.endswith("FAILED") or normalized_state.endswith("ERROR"):
            raise GeminiExecutionError(
                f"Gemini file processing failed with state '{state_name}'."
            )

        if time.monotonic() >= deadline:
            raise GeminiExecutionError(
                "Gemini timed out while processing the uploaded video."
            )

        time.sleep(VIDEO_POLL_INTERVAL_SECONDS)
        current_file = client.files.get(name=current_file.name)


def build_upload_config(video: Video) -> dict[str, str] | None:
    mime_type = (video.mime_type or "").strip()
    if not mime_type:
        return None

    if mime_type == "application/octet-stream":
        return None

    return {"mime_type": mime_type}


def run_gemini_video_analysis(
    *,
    video: Video,
    prompt_template: PromptTemplate,
) -> GeminiAnalysisResult:
    if not settings.gemini_configured:
        raise GeminiConfigurationError(
            "Gemini is not configured. Set DETECT_DEMO_GEMINI_API_KEY in backend/.env."
        )

    video_path = Path(video.stored_path)
    if not video_path.exists():
        raise GeminiExecutionError(
            f"Stored video file was not found on disk: {video_path}"
        )

    client = genai.Client(api_key=settings.gemini_api_key)
    uploaded_file: Any | None = None

    try:
        upload_config = build_upload_config(video)
        uploaded_file = client.files.upload(file=video_path, config=upload_config)

        if (video.mime_type or "").startswith("video/") or video_path.suffix.lower() in {
            ".mp4",
            ".mov",
            ".avi",
            ".mkv",
            ".webm",
        }:
            uploaded_file = wait_for_video_processing(client, uploaded_file)

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[uploaded_file, build_analysis_instruction(prompt_template)],
        )
        raw_response = extract_response_text(response)
        parsed_response = parse_analysis_response(raw_response)

        return GeminiAnalysisResult(
            raw_response=raw_response,
            parsed_response=parsed_response,
            model_name=settings.gemini_model,
            confidence=None,
        )
    except GeminiConfigurationError:
        raise
    except GeminiExecutionError:
        raise
    except Exception as exc:  # pragma: no cover - network/service dependency
        raise GeminiExecutionError(f"Gemini request failed: {exc}") from exc
    finally:
        if uploaded_file is not None and getattr(uploaded_file, "name", None):
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass
