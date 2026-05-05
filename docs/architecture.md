# Architecture Notes

## Current Shape

- `frontend/` contains a minimal Next.js App Router app.
- `backend/` contains a FastAPI app with SQLAlchemy models and Alembic migrations.
- `prompts/` is reserved for local prompt template files and future prompt packs.

## Backend Flow

1. `POST /api/v1/videos/upload` stores the uploaded file under `backend/data/uploads/`.
2. The backend saves video metadata into PostgreSQL.
3. `POST /api/v1/prompt-templates/sync` upserts prompt template seed files from `prompts/templates/`.
4. `POST /api/v1/analyses` creates an analysis row, uploads the local video file to Gemini, runs the selected prompt template, and stores the result.

## Why This Is Kept Minimal

- No Docker
- No auth
- No background workers
- No cloud storage
- No orchestration layer beyond a single synchronous Gemini call

The goal is a stable local foundation that is easy to extend in small steps.
