Fitness App — Monorepo
======================

This repository contains:
- Backend: FastAPI service (SQLite storage) in `backend/`
- Frontend: React + Vite app in `frontend/`
- Shared test fixtures in `shared/`
- Local containers and images in `infra/` (Dockerfiles and docker-compose)
- Developer helpers in `Makefile`


Prerequisites
-------------
- Python 3.11+
- Node.js 18+ and pnpm (recommended) or npm
- Docker Desktop (optional, for the Compose setup)


Quick start (local dev)
-----------------------
1) Create an env file from the example at the repo root:
```bash
cp .env.example .env
```
The defaults expose the backend on port 8000 and the frontend on port 5173.

2) Install dependencies:
- Backend (from repo root):
```bash
cd backend && pip install .
```
- Frontend:
```bash
cd frontend && npm install
```

3) Run the apps in two terminals:
- Backend (from repo root):
```bash
make backend
```
  This starts `uvicorn app.main:app` with reload on `http://localhost:8000`.

- Frontend:
```bash
make frontend
```
  This starts Vite dev server on `http://localhost:5173`.

Tip: You can also run only the backend via `make dev` (alias for `make backend`).


Run with Docker Compose
-----------------------
From the `infra/` directory:
```bash
cd infra && docker compose up -d --build
```
Services:
- Backend: http://localhost:8000
- Frontend: http://localhost:8080

Stop the stack:
```bash
cd infra && docker compose down
```


Environment variables
---------------------
See `.env.example` for all available variables. Key ones:
- `PORT` (default `8000`) — backend HTTP port
- `CORS_ORIGINS` — allowed origins for the frontend (defaults include `http://localhost:5173`)
- `DATABASE_URL` — SQLite path (local: `sqlite:///./app.db`; in Docker: `sqlite:////data/app.db`)
- `LLM_PROVIDER` — mock by default
- `POSE_CLIENT` — on/off feature flag
- `ANALYSIS_REMOTE` — on/off feature flag
- `VITE_API_BASE` — frontend base URL for the backend API (defaults to `http://localhost:8000`)


API overview
------------
- OpenAPI/Swagger UI: `http://localhost:8000/docs`
- Health check: `GET /health` → `{ "status": "ok" }`
- Plans:
  - `POST /api/plans/` — generate and persist a workout plan from a `UserGoal`
  - `GET /api/plans/{plan_id}` — fetch a previously generated plan
- References:
  - `POST /api/references/` — upsert a reference template


Make targets
------------
- `make backend` — run FastAPI with reload (port `PORT`, default 8000)
- `make frontend` — run Vite dev server (port 5173)
- `make dev` — alias for `make backend`
- `make export-schemas` — export Pydantic/SQLModel schemas
- `make up` — `docker compose up -d --build` from `infra/`
- `make down` — `docker compose down` from `infra/`


Project layout
--------------
```
backend/                 # FastAPI app, models, routers, scripts
frontend/                # React + Vite front-end
infra/                   # Dockerfiles and docker-compose.yml
shared/fixtures/         # Example payloads and data
Makefile                 # Helper commands for dev and Docker
.env.example             # Sample configuration
```


Troubleshooting
---------------
- Port already in use: change `PORT` or stop the conflicting process.
- CORS errors: ensure `CORS_ORIGINS` includes the frontend URL (5173 or 8080).
- Frontend can’t reach backend: verify `VITE_API_BASE` matches your backend URL.


Notes
-----
- As of October 31, 2025, the defaults are tested locally on macOS and Linux with Python 3.11+ and Node 18+.

Live pose + real‑time rep counting (M2)
--------------------------------------
The Live page now runs client‑side pose estimation (TF.js MoveNet Lightning) and streams keypoints to the backend via WebSocket for real‑time rep counting.

How to use locally:
1. Start backend and frontend (two terminals):
   - Backend: `make backend` (http://localhost:8000)
   - Frontend: `make frontend` (http://localhost:5173)
2. Open the frontend in the browser and go to “Live”.
3. Click “Start Session” (required on iOS due to autoplay policies) and allow camera access.
4. Choose the exercise (Push‑up or Squat). Landmarks are detected in the browser; only keypoints are sent to `/ws/session`.
5. Watch the counter, traffic‑light bar, and tips update in real time. Click “Stop Session” to stop.

Notes and tips:
- Performance target is ~30 FPS; actual FPS depends on your device. If slow, reduce resolution in code or browser zoom.
- Privacy: by default, no raw video leaves your device. Only normalized 2D keypoints are sent to the server for counting.
- If you see CORS or WS errors, verify the backend is on port 8000 and reachable from the frontend origin (5173).


