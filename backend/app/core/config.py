from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "detect-demo API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = True
    database_url: str = "postgresql+psycopg://localhost/detect_demo"
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://127.0.0.1:3001",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    prompts_dir: Path = REPO_ROOT / "prompts"
    gemini_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "DETECT_DEMO_GEMINI_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
        ),
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        validation_alias=AliasChoices(
            "DETECT_DEMO_GEMINI_MODEL",
            "GEMINI_MODEL",
        ),
    )
    clerk_secret_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "DETECT_DEMO_CLERK_SECRET_KEY",
            "CLERK_SECRET_KEY",
        ),
    )
    clerk_jwt_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "DETECT_DEMO_CLERK_JWT_KEY",
            "CLERK_JWT_KEY",
        ),
    )
    clerk_authorized_parties: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        validation_alias=AliasChoices(
            "DETECT_DEMO_CLERK_AUTHORIZED_PARTIES",
            "CLERK_AUTHORIZED_PARTIES",
        ),
    )
    dev_auth_bypass: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "DETECT_DEMO_DEV_AUTH_BYPASS",
            "DEV_AUTH_BYPASS",
        ),
    )
    dev_auth_seed_profile: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "DETECT_DEMO_DEV_AUTH_SEED_PROFILE",
            "DEV_AUTH_SEED_PROFILE",
        ),
    )
    dev_auth_clerk_user_id: str = Field(
        default="dev-bypass-local-user",
        validation_alias=AliasChoices(
            "DETECT_DEMO_DEV_AUTH_CLERK_USER_ID",
            "DEV_AUTH_CLERK_USER_ID",
        ),
    )
    dev_auth_display_name: str = Field(
        default="Mert Yilmaz",
        validation_alias=AliasChoices(
            "DETECT_DEMO_DEV_AUTH_DISPLAY_NAME",
            "DEV_AUTH_DISPLAY_NAME",
        ),
    )
    dev_auth_email: str = Field(
        default="local-athlete@detect.demo",
        validation_alias=AliasChoices(
            "DETECT_DEMO_DEV_AUTH_EMAIL",
            "DEV_AUTH_EMAIL",
        ),
    )

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix="DETECT_DEMO_",
    )

    @field_validator("cors_origins", "clerk_authorized_parties", mode="before")
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

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_model)

    @property
    def clerk_configured(self) -> bool:
        return bool(self.clerk_secret_key or self.clerk_jwt_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
