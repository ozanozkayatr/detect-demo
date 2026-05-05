from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.core.config import settings


class VideoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    stored_path: str
    mime_type: str
    size_bytes: int
    created_at: datetime

    @computed_field(return_type=str)
    @property
    def file_url(self) -> str:
        return f"{settings.api_v1_prefix}/videos/{self.id}/file"
