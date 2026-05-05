from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "detect-demo API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = True
    database_url: str = "postgresql+psycopg://localhost/detect_demo"
    cors_origins: list[str] = [
        "http://127.0.0.1:3001",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    prompts_dir: Path = REPO_ROOT / "prompts"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix="DETECT_DEMO_",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("upload_dir", "prompts_dir", mode="before")
    @classmethod
    def resolve_path(cls, value: str | Path) -> Path:
        candidate = Path(value)
        if candidate.is_absolute():
            return candidate
        return (REPO_ROOT / candidate).resolve()

    def ensure_local_directories(self) -> None:
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.prompts_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
