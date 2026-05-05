from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


@dataclass(slots=True)
class StoredUpload:
    original_filename: str
    stored_path: Path
    mime_type: str
    size_bytes: int


def build_storage_path(filename: str) -> Path:
    suffix = Path(filename).suffix
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    return settings.upload_dir / f"{timestamp}_{uuid4().hex}{suffix}"


async def save_upload(file: UploadFile) -> StoredUpload:
    original_filename = file.filename or "upload.bin"
    destination = build_storage_path(original_filename)
    destination.parent.mkdir(parents=True, exist_ok=True)

    size_bytes = 0
    with destination.open("wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            output_file.write(chunk)
            size_bytes += len(chunk)

    await file.close()

    return StoredUpload(
        original_filename=original_filename,
        stored_path=destination,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=size_bytes,
    )

