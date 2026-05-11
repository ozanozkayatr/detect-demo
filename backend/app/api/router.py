from fastapi import APIRouter

from app.api.routes import analyses, gemini, health, personas, prompt_templates, videos

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(gemini.router, prefix="/gemini", tags=["gemini"])
api_router.include_router(personas.router, prefix="/personas", tags=["personas"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
api_router.include_router(
    prompt_templates.router,
    prefix="/prompt-templates",
    tags=["prompt-templates"],
)
