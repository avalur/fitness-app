from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import create_db_and_tables
from .api.routers.plans import router as plans_router
from .api.routers.references import router as references_router


def get_cors_origins() -> List[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(title="Fitness App Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await create_db_and_tables()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(plans_router, prefix="/api")
app.include_router(references_router, prefix="/api")
