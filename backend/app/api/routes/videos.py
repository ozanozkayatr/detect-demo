from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.video import Video
from app.schemas.video import VideoRead
from app.services.upload_service import save_upload

router = APIRouter()


@router.get("", response_model=list[VideoRead])
def list_videos(db: Session = Depends(get_db)) -> list[Video]:
    statement = select(Video).order_by(Video.created_at.desc())
    return list(db.scalars(statement))


@router.post("/upload", response_model=VideoRead, status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Video:
    stored_upload = await save_upload(file)

    video = Video(
        original_filename=stored_upload.original_filename,
        stored_path=str(stored_upload.stored_path),
        mime_type=stored_upload.mime_type,
        size_bytes=stored_upload.size_bytes,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video
