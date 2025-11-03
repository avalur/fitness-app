SHELL := /bin/bash

.PHONY: dev backend frontend test up down export-schemas

DEV_ENV ?= .env

backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port $${PORT:-8000}

frontend:
	cd frontend && npm run dev

export-schemas:
	cd backend && python -m app.scripts.export_schemas

dev: backend

test:
	pytest -q || true

up:
	cd infra && docker compose up -d --build

down:
	cd infra && docker compose down
