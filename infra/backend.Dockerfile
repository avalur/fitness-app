# syntax=docker/dockerfile:1
FROM python:3.11-slim AS base

WORKDIR /app
COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e /app/backend

COPY backend /app/backend
WORKDIR /app/backend
ENV PORT=8000
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
