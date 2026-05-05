from fastapi import APIRouter

from app.api.routes import analyses, health, prompt_templates, videos

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
api_router.include_router(
    prompt_templates.router,
    prefix="/prompt-templates",
    tags=["prompt-templates"],
)

