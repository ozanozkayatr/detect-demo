# Architecture Notes

## Current Shape

- `frontend/` contains a minimal Next.js App Router app.
- `backend/` contains a FastAPI app with SQLAlchemy models and Alembic migrations.
- `prompts/` is reserved for local prompt template files and future prompt packs.

## Backend Flow

1. `POST /api/v1/videos/upload` stores the uploaded file under `backend/data/uploads/`.
2. The backend saves video metadata into PostgreSQL.
3. Prompt template files can later be loaded from `prompts/templates/`.
4. Analysis creation is currently a local placeholder that records intent and status in the database.

## Why This Is Kept Minimal

- No Docker
- No auth
- No background workers
- No cloud storage
- No Gemini integration yet

The goal is a stable local foundation that is easy to extend in small steps.

