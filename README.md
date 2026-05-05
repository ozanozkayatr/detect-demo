# detect-demo

Local-first monorepo scaffold for a boxing video analysis demo. This foundation includes a minimal Next.js frontend, a FastAPI backend, PostgreSQL-ready SQLAlchemy models, and Alembic migrations. Gemini integration is intentionally not included yet.

## Stack

- Frontend: Next.js App Router with TypeScript
- Backend: FastAPI with SQLAlchemy and Alembic
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

### Frontend

Defined in [`frontend/.env.example`](./frontend/.env.example):

- `NEXT_PUBLIC_API_BASE_URL`

## Development Notes

- Uploads are stored locally under `backend/data/uploads/`.
- Prompt template seed files live under `prompts/templates/`.
- The upload page syncs local prompt-template files before listing them.
- The current analysis flow creates a placeholder database record only. No model analysis runs yet.
- Gemini integration is intentionally deferred.

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
6. Create the placeholder analysis and inspect the returned stub payload

### API flow

Upload a video:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/videos/upload \
  -F "file=@/absolute/path/to/local-video.mp4"
```

Create a placeholder analysis:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/analyses \
  -H "Content-Type: application/json" \
  -d '{"video_id": 1, "prompt_template_id": 1}'
```

The response includes:

- uploaded video metadata
- selected prompt template summary
- placeholder analysis status
- stubbed `parsed_response`

## Migrations

The initial Alembic migration creates three tables:

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

## What Comes Later

The next implementation step should replace the stubbed analysis creation with a real prompt execution step against uploaded videos. Gemini integration should happen only after this local flow is stable.
