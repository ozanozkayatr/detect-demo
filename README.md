# detect-demo

Local-first monorepo for a boxing video analysis demo. The current iteration includes a minimal Next.js frontend, a FastAPI backend, PostgreSQL-backed uploads and analyses, prompt-template sync, and a first synchronous Gemini execution path.

## Stack

- Frontend: Next.js App Router with TypeScript
- Backend: FastAPI with SQLAlchemy, Alembic, and the Google GenAI SDK
- Database: PostgreSQL (`detect_demo`)
- Prompt assets: local files under [`prompts/`](./prompts)

## Repository Layout

```text
detect-demo/
├── backend/
├── docs/
├── frontend/
├── prompts/
├── .env.example
└── README.md
```

## Local Setup

### 1. Create the PostgreSQL database

Use a separate local database named `detect_demo`. Do not reuse or modify any `dev` database.

```bash
createdb detect_demo
```

If you prefer `psql`:

```bash
psql postgres -c "CREATE DATABASE detect_demo;"
```

### 2. Configure environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Update values if your local PostgreSQL user, password, or ports differ.
If your local Postgres uses password auth, set `DETECT_DEMO_DATABASE_URL` explicitly in `backend/.env`.

For real Gemini analysis, also set:

```bash
DETECT_DEMO_GEMINI_API_KEY=your_api_key_here
DETECT_DEMO_GEMINI_MODEL=gemini-2.5-flash
```

### 3. Install and run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Backend endpoints:

- `GET http://127.0.0.1:8000/api/v1/health`
- `POST http://127.0.0.1:8000/api/v1/videos/upload`
- `POST http://127.0.0.1:8000/api/v1/prompt-templates/sync`
- `GET http://127.0.0.1:8000/api/v1/analyses`
- `GET http://127.0.0.1:8000/api/v1/prompt-templates`
- `POST http://127.0.0.1:8000/api/v1/analyses`

### 4. Install and run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend pages:

- `http://127.0.0.1:3001/`
- `http://127.0.0.1:3001/status`
- `http://127.0.0.1:3001/upload`

## Environment Variables

### Backend

Defined in [`backend/.env.example`](./backend/.env.example):

- `DETECT_DEMO_APP_NAME`
- `DETECT_DEMO_DEBUG`
- `DETECT_DEMO_DATABASE_URL`
- `DETECT_DEMO_CORS_ORIGINS`
- `DETECT_DEMO_UPLOAD_DIR`
- `DETECT_DEMO_PROMPTS_DIR`
- `DETECT_DEMO_GEMINI_API_KEY`
- `DETECT_DEMO_GEMINI_MODEL`

### Frontend

Defined in [`frontend/.env.example`](./frontend/.env.example):

- `NEXT_PUBLIC_API_BASE_URL`

## Development Notes

- Uploads are stored locally under `backend/data/uploads/`.
- Prompt template seed files live under `prompts/templates/`.
- The upload page syncs local prompt-template files before listing them.
- Real analysis is synchronous: the request uploads the saved local video to Gemini, waits for video processing, runs the selected prompt template, stores the result, and returns it to the frontend.
- The backend stores both `raw_response` and a lightweight best-effort `parsed_response`.
- When Gemini is not configured, analysis creation fails cleanly with a typed backend error and the failed analysis row is stored with `status=failed`.

## Prompt Template Sync

Starter prompt templates are stored as local JSON files:

- `observable_only`
- `boxing_structured`
- `coach_summary`

To sync them into PostgreSQL:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/prompt-templates/sync
```

This operation is repeatable and upserts templates by `key`.

## Local Demo Flow

### Browser flow

1. Open `http://127.0.0.1:3001/upload`
2. Choose a local video file
3. Upload it to the backend
4. Confirm prompt templates are available
5. Select a prompt template
6. Run the Gemini analysis
7. Inspect the returned status, raw response, and parsed response

### API flow

Upload a video:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/videos/upload \
  -F "file=@/absolute/path/to/local-video.mp4"
```

Sync prompt templates:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/prompt-templates/sync
```

Run analysis:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/analyses \
  -H "Content-Type: application/json" \
  -d '{"video_id": 1, "prompt_template_id": 1}'
```

The response includes:

- uploaded video metadata
- selected prompt template summary
- analysis status
- `raw_response`
- best-effort `parsed_response`

If `DETECT_DEMO_GEMINI_API_KEY` is not set, the backend returns a typed `503` error like:

```json
{
  "detail": {
    "code": "gemini_not_configured",
    "message": "Gemini is not configured. Set DETECT_DEMO_GEMINI_API_KEY in backend/.env.",
    "analysis_id": 2
  }
}
```

## Migrations

The current Alembic migrations create and evolve these tables:

- `videos`
- `prompt_templates`
- `analyses`

For future schema changes:

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Current Limitations

- Analysis execution is synchronous inside the request. There are no queues, retries, polling endpoints, or background jobs.
- The parsed-response layer is intentionally lightweight. It works best when Gemini returns either JSON or clearly labeled sections.
- `confidence` remains `null` for now because this first integration does not derive a reliable confidence score from Gemini responses.
- The backend deletes the temporary Gemini file after the request when possible, but it does not yet persist Gemini-side file metadata.
- No pose estimation, tracking, or multi-step video pipeline exists yet.

## What Comes Later

The next implementation step should improve result quality and robustness: better output shaping, better parsing for structured boxing feedback, and optionally a separate execution path for longer-running analyses without changing the local-first development model.
