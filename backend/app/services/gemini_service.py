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
from app.services.analysis_parser import ParseOutcome, parse_analysis_response

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
    parser_strategy: str
    json_parse_succeeded: bool
    template_key_snapshot: str


@dataclass(slots=True)
class TemplateExecutionPolicy:
    prefer_json_output: bool
    response_mime_type: str | None
    response_json_schema: dict[str, object] | None
    system_instruction: str
    temperature: float


NORMALIZED_ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "issues": {"type": "array", "items": {"type": "string"}},
        "next_steps": {"type": "array", "items": {"type": "string"}},
        "notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "strengths", "issues", "next_steps", "notes"],
}


def build_template_policy(prompt_template: PromptTemplate) -> TemplateExecutionPolicy:
    template_key = prompt_template.key.strip().lower()
    system_instruction_lines = [
        "You are a careful boxing video analyst for a local demo app.",
        "Analyze only what is clearly visible in the uploaded video.",
        "Prefer uncertainty over overclaiming.",
        "Do not guess hidden details, off-camera actions, intent, score, impact, or unseen causes.",
        "Do not assume there is a partner, target, or exchange unless it is clearly visible.",
        "Do not name an exact punch type unless the visual evidence is clear enough to support it.",
        "If angle, framing, motion blur, speed, or occlusion limit confidence, say that explicitly.",
        "Keep the result concise, beginner-friendly, and useful for review.",
    ]

    if template_key == "boxing_structured":
        system_instruction_lines.extend(
            [
                "This template is the default structured boxing review.",
                "Return stable, compact, evidence-first output that is easy to parse.",
                "If a conclusion is uncertain, put that uncertainty in notes instead of guessing.",
            ]
        )
    elif template_key == "observable_only":
        system_instruction_lines.extend(
            [
                "This template is intentionally conservative.",
                "Prefer direct observation over interpretation, and call out visibility limitations early.",
            ]
        )
    elif template_key == "coach_summary":
        system_instruction_lines.extend(
            [
                "This template should sound supportive and practical, but still remain evidence-based.",
                "Do not become overly technical if simpler language is sufficient.",
            ]
        )

    system_instruction = "\n".join(system_instruction_lines)

    if template_key == "boxing_structured":
        return TemplateExecutionPolicy(
            prefer_json_output=True,
            response_mime_type="application/json",
            response_json_schema=NORMALIZED_ANALYSIS_JSON_SCHEMA,
            system_instruction=system_instruction,
            temperature=0.1,
        )

    if template_key == "observable_only":
        return TemplateExecutionPolicy(
            prefer_json_output=False,
            response_mime_type=None,
            response_json_schema=None,
            system_instruction=system_instruction,
            temperature=0.2,
        )

    if template_key == "coach_summary":
        return TemplateExecutionPolicy(
            prefer_json_output=False,
            response_mime_type=None,
            response_json_schema=None,
            system_instruction=system_instruction,
            temperature=0.3,
        )

    return TemplateExecutionPolicy(
        prefer_json_output=False,
        response_mime_type=None,
        response_json_schema=None,
        system_instruction=system_instruction,
        temperature=0.3,
    )


def build_generate_content_config(
    template_policy: TemplateExecutionPolicy,
) -> dict[str, object]:
    config: dict[str, object] = {
        "system_instruction": template_policy.system_instruction,
        "temperature": template_policy.temperature,
    }

    if template_policy.response_mime_type is not None:
        config["response_mime_type"] = template_policy.response_mime_type

    if template_policy.response_json_schema is not None:
        config["response_json_schema"] = template_policy.response_json_schema

    return config


def build_analysis_instruction(prompt_template: PromptTemplate) -> str:
    template_key = prompt_template.key.strip().lower()
    base_instruction = prompt_template.prompt_body.strip()

    if template_key == "boxing_structured":
        format_instruction = (
            "Return a concise JSON object with exactly these keys: "
            "summary, strengths, issues, next_steps, notes. "
            "Use short strings and short arrays. Return empty arrays instead of guessing. "
            "Only include specific punch names when they are visually clear. "
            "Use notes for visibility caveats and uncertainty."
        )
    elif template_key == "coach_summary":
        format_instruction = (
            "Return five labeled sections exactly named Summary, Strengths, Issues, "
            "Next Steps, and Notes. Keep the summary short, practical, supportive, and grounded in visible evidence."
        )
    else:
        format_instruction = (
            "Return the result in five labeled sections exactly named: "
            "Summary, Strengths, Issues, Next Steps, and Notes. "
            "Use bullets where useful, and place uncertainty or visibility limits in Notes."
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
    template_policy = build_template_policy(prompt_template)

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
            config=build_generate_content_config(template_policy),
        )
        raw_response = extract_response_text(response)
        parse_outcome: ParseOutcome = parse_analysis_response(
            raw_response,
            prefer_json=template_policy.prefer_json_output,
        )

        return GeminiAnalysisResult(
            raw_response=raw_response,
            parsed_response=parse_outcome.parsed_response,
            model_name=settings.gemini_model,
            confidence=None,
            parser_strategy=parse_outcome.parser_strategy,
            json_parse_succeeded=parse_outcome.json_parse_succeeded,
            template_key_snapshot=prompt_template.key,
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
