from __future__ import annotations

import json
import re

SECTION_ALIASES = {
    "summary": "summary",
    "strengths": "strengths",
    "issues": "issues",
    "next steps": "next_steps",
    "next_steps": "next_steps",
    "notes": "notes",
}
LIST_FIELDS = {"strengths", "issues", "next_steps", "notes"}


def default_parsed_response() -> dict[str, object]:
    return {
        "summary": "",
        "strengths": [],
        "issues": [],
        "next_steps": [],
        "notes": [],
    }


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


def normalize_summary(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_json_payload(payload: dict[str, object]) -> dict[str, object]:
    parsed = default_parsed_response()

    for source_key, target_key in SECTION_ALIASES.items():
        if source_key not in payload:
            continue

        value = payload[source_key]
        if target_key in LIST_FIELDS:
            parsed[target_key] = normalize_items(value)
        else:
            parsed[target_key] = normalize_summary(value)

    if not parsed["summary"]:
        parsed["notes"] = normalize_items(parsed["notes"]) + [
            "Parsed from JSON, but no summary field was present.",
        ]

    return parsed


def parse_heading_sections(raw_response: str) -> dict[str, object]:
    parsed = default_parsed_response()
    sections: dict[str, list[str]] = {key: [] for key in parsed}
    current_section: str | None = None

    for raw_line in raw_response.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = re.match(
            r"^(summary|strengths|issues|next steps|next_steps|notes)\s*:\s*(.*)$",
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

    parsed["summary"] = " ".join(sections["summary"]).strip()
    for field_name in LIST_FIELDS:
        parsed[field_name] = normalize_items(sections[field_name])

    if not any(parsed.values()):
        paragraphs = [block.strip() for block in raw_response.split("\n\n") if block.strip()]
        parsed["summary"] = paragraphs[0] if paragraphs else raw_response.strip()
        parsed["notes"] = [
            "Best-effort parser could not confidently structure the Gemini response.",
        ]

    return parsed


def parse_analysis_response(raw_response: str) -> dict[str, object]:
    stripped_response = raw_response.strip()

    if not stripped_response:
        parsed = default_parsed_response()
        parsed["notes"] = ["Gemini returned an empty text response."]
        return parsed

    try:
        json_payload = json.loads(stripped_response)
    except json.JSONDecodeError:
        return parse_heading_sections(stripped_response)

    if isinstance(json_payload, dict):
        parsed = normalize_json_payload(json_payload)
        parsed["notes"] = normalize_items(parsed["notes"]) + [
            "Parsed from Gemini JSON output using a lightweight normalizer.",
        ]
        return parsed

    parsed = default_parsed_response()
    parsed["summary"] = stripped_response
    parsed["notes"] = [
        "Gemini returned JSON, but not an object. Stored the raw text as the summary.",
    ]
    return parsed
