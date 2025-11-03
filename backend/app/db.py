from __future__ import annotations

import os
import asyncio
from contextlib import contextmanager
from typing import Generator

from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
engine = create_engine(DATABASE_URL, echo=False)


async def create_db_and_tables() -> None:
    def _create() -> None:
        SQLModel.metadata.create_all(engine)

    await asyncio.to_thread(_create)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
