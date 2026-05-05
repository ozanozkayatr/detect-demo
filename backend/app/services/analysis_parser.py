from __future__ import annotations

import json
import re
from dataclasses import dataclass

SECTION_ALIASES = {
    "summary": "summary",
    "strength": "strengths",
    "strengths": "strengths",
    "issue": "issues",
    "issues": "issues",
    "next step": "next_steps",
    "next steps": "next_steps",
    "next_steps": "next_steps",
    "next-steps": "next_steps",
    "nextsteps": "next_steps",
    "note": "notes",
    "notes": "notes",
}
LIST_FIELDS = {"strengths", "issues", "next_steps", "notes"}
HEURISTIC_STRENGTH_MARKERS = ("good", "strong", "effective", "balanced", "sharp")
HEURISTIC_ISSUE_MARKERS = ("issue", "risk", "problem", "miss", "drops", "open")
HEURISTIC_NEXT_STEP_MARKERS = ("next", "focus", "practice", "work on", "try")


@dataclass(slots=True)
class ParseOutcome:
    parsed_response: dict[str, object]
    parser_strategy: str
    json_parse_succeeded: bool


def default_parsed_response() -> dict[str, object]:
    return {
        "summary": "",
        "strengths": [],
        "issues": [],
        "next_steps": [],
        "notes": [],
    }


def note_only_response(note: str) -> dict[str, object]:
    parsed = default_parsed_response()
    parsed["notes"] = [note]
    return parsed


def normalize_summary(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_items(value: object) -> list[str]:
    if value is None:
        return []

    if isinstance(value, list):
        items = value
    else:
        text = str(value).strip()
        if not text:
            return []
        items = re.split(r"\n+|; ", text)

    normalized: list[str] = []
    for item in items:
        cleaned = re.sub(r"^[-*0-9.)\s]+", "", str(item).strip())
        if cleaned:
            normalized.append(cleaned)
    return normalized


def normalize_json_payload(payload: dict[str, object]) -> dict[str, object]:
    parsed = default_parsed_response()
    normalized_payload = {str(key).strip().lower(): value for key, value in payload.items()}

    for source_key, target_key in SECTION_ALIASES.items():
        if source_key not in normalized_payload:
            continue

        value = normalized_payload[source_key]
        if target_key in LIST_FIELDS:
            parsed[target_key] = normalize_items(value)
        else:
            parsed[target_key] = normalize_summary(value)

    if not parsed["summary"]:
        parsed["notes"] = normalize_items(parsed["notes"]) + [
            "Parsed JSON output did not include a summary field.",
        ]

    return parsed


def extract_json_candidate(raw_response: str) -> str | None:
    stripped_response = raw_response.strip()
    if not stripped_response:
        return None

    fenced_match = re.search(
        r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```",
        stripped_response,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if fenced_match:
        return fenced_match.group(1).strip()

    if stripped_response.startswith("{") or stripped_response.startswith("["):
        return stripped_response

    first_brace = stripped_response.find("{")
    last_brace = stripped_response.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        return stripped_response[first_brace : last_brace + 1]

    return None


def try_parse_json(raw_response: str) -> ParseOutcome | None:
    json_candidate = extract_json_candidate(raw_response)
    if json_candidate is None:
        return None

    try:
        payload = json.loads(json_candidate)
    except json.JSONDecodeError:
        return None

    if isinstance(payload, dict):
        parsed = normalize_json_payload(payload)
        parsed["notes"] = normalize_items(parsed["notes"]) + [
            "Normalized from Gemini JSON output.",
        ]
        return ParseOutcome(
            parsed_response=parsed,
            parser_strategy="json",
            json_parse_succeeded=True,
        )

    parsed = default_parsed_response()
    parsed["summary"] = json_candidate
    parsed["notes"] = [
        "Gemini returned JSON, but not a JSON object. Stored the text as the summary.",
    ]
    return ParseOutcome(
        parsed_response=parsed,
        parser_strategy="json_scalar_fallback",
        json_parse_succeeded=True,
    )


def parse_labeled_sections(raw_response: str) -> ParseOutcome | None:
    parsed = default_parsed_response()
    sections: dict[str, list[str]] = {key: [] for key in parsed}
    current_section: str | None = None

    for raw_line in raw_response.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = re.match(
            r"^(summary|strength|strengths|issue|issues|next step|next steps|next_steps|next-steps|note|notes)\s*:\s*(.*)$",
            line,
            re.IGNORECASE,
        )
        if match:
            current_section = SECTION_ALIASES[match.group(1).lower()]
            trailing_text = match.group(2).strip()
            if trailing_text:
                sections[current_section].append(trailing_text)
            continue

        if current_section:
            sections[current_section].append(line)

    if not any(sections.values()):
        return None

    parsed["summary"] = " ".join(sections["summary"]).strip()
    for field_name in LIST_FIELDS:
        parsed[field_name] = normalize_items(sections[field_name])

    if not parsed["summary"]:
        paragraphs = [block.strip() for block in raw_response.split("\n\n") if block.strip()]
        parsed["summary"] = paragraphs[0] if paragraphs else raw_response.strip()
        parsed["notes"] = normalize_items(parsed["notes"]) + [
            "Summary was inferred because the labeled sections did not include one.",
        ]

    return ParseOutcome(
        parsed_response=parsed,
        parser_strategy="labeled_sections",
        json_parse_succeeded=False,
    )


def assign_heuristic_line(parsed: dict[str, object], line: str) -> None:
    lowered = line.lower()

    if any(marker in lowered for marker in HEURISTIC_NEXT_STEP_MARKERS):
        parsed["next_steps"] = normalize_items(parsed["next_steps"]) + [line]
        return

    if any(marker in lowered for marker in HEURISTIC_ISSUE_MARKERS):
        parsed["issues"] = normalize_items(parsed["issues"]) + [line]
        return

    if any(marker in lowered for marker in HEURISTIC_STRENGTH_MARKERS):
        parsed["strengths"] = normalize_items(parsed["strengths"]) + [line]
        return

    parsed["notes"] = normalize_items(parsed["notes"]) + [line]


def parse_heuristic_text(raw_response: str) -> ParseOutcome:
    parsed = default_parsed_response()
    paragraphs = [block.strip() for block in raw_response.split("\n\n") if block.strip()]
    parsed["summary"] = paragraphs[0] if paragraphs else raw_response.strip()

    bullet_like_lines = [
        re.sub(r"^[-*0-9.)\s]+", "", line.strip())
        for line in raw_response.splitlines()
        if line.strip()
    ]

    for line in bullet_like_lines[1:]:
        if not line:
            continue
        assign_heuristic_line(parsed, line)

    if not normalize_items(parsed["strengths"]) and not normalize_items(parsed["issues"]):
        parsed["notes"] = normalize_items(parsed["notes"]) + [
            "Best-effort parser could not confidently separate strengths from issues.",
        ]

    return ParseOutcome(
        parsed_response=parsed,
        parser_strategy="heuristic_text",
        json_parse_succeeded=False,
    )


def parse_analysis_response(
    raw_response: str,
    *,
    prefer_json: bool = False,
) -> ParseOutcome:
    stripped_response = raw_response.strip()

    if not stripped_response:
        return ParseOutcome(
            parsed_response=note_only_response("Gemini returned an empty text response."),
            parser_strategy="empty",
            json_parse_succeeded=False,
        )

    if prefer_json:
        json_outcome = try_parse_json(stripped_response)
        if json_outcome is not None:
            return json_outcome

    section_outcome = parse_labeled_sections(stripped_response)
    if section_outcome is not None:
        return section_outcome

    if not prefer_json:
        json_outcome = try_parse_json(stripped_response)
        if json_outcome is not None:
            return json_outcome

    return parse_heuristic_text(stripped_response)
