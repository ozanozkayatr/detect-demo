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
- `GET http://127.0.0.1:8000/api/v1/analyses`
- `GET http://127.0.0.1:8000/api/v1/prompt-templates`

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
- Prompt files are expected under `prompts/templates/`.
- The upload flow currently saves video files and metadata only. No model analysis runs yet.
- Analysis records can be created as placeholders through the API, but Gemini integration is intentionally deferred.

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

The next implementation step should attach a real upload UI to the backend upload endpoint and then trigger prompt-driven video analysis from saved uploads. Gemini integration should happen only after that local flow is stable.
