from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.api.errors import api_error
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoRead
from app.services.upload_service import save_upload

router = APIRouter()


def ensure_local_upload_path(video: Video) -> Path:
    stored_path = Path(video.stored_path).resolve()
    upload_root = settings.upload_dir.resolve()

    try:
        stored_path.relative_to(upload_root)
    except ValueError as exc:
        raise api_error(
            status_code=400,
            code="invalid_video_path",
            message="Video path is outside the configured upload directory.",
        ) from exc

    if not stored_path.exists() or not stored_path.is_file():
        raise api_error(
            status_code=404,
            code="video_file_not_found",
            message="Stored video file was not found on disk.",
        )

    return stored_path


@router.get("", response_model=list[VideoRead])
def list_videos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Video]:
    statement = (
        select(Video)
        .where(Video.user_id == current_user.id)
        .order_by(Video.created_at.desc())
    )
    return list(db.scalars(statement))


@router.get("/{video_id}/file")
def get_video_file(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    statement = select(Video).where(
        Video.id == video_id,
        Video.user_id == current_user.id,
    )
    video = db.scalar(statement)
    if video is None:
        raise api_error(
            status_code=404,
            code="video_not_found",
            message="Video not found.",
        )

    stored_path = ensure_local_upload_path(video)
    media_type = video.mime_type if video.mime_type and video.mime_type != "application/octet-stream" else None

    return FileResponse(
        path=stored_path,
        media_type=media_type,
        filename=video.original_filename,
    )


@router.post("/upload", response_model=VideoRead, status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Video:
    stored_upload = await save_upload(file)

    video = Video(
        user_id=current_user.id,
        original_filename=stored_upload.original_filename,
        stored_path=str(stored_upload.stored_path),
        mime_type=stored_upload.mime_type,
        size_bytes=stored_upload.size_bytes,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video
