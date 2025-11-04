from __future__ import annotations

import json
from typing import Literal, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from ...models.schemas import PoseFrame
from ...services.rep_counter import RepCounter


router = APIRouter(prefix="/ws", tags=["ws"])


@router.websocket("/session")
async def session_ws(websocket: WebSocket, exercise: Optional[Literal["push_up", "squat"]] = Query("push_up")):
    await websocket.accept()
    counter = RepCounter(exercise or "push_up")
    try:
        while True:
            msg = await websocket.receive_text()
            try:
                data = json.loads(msg)
                frame = PoseFrame(**data)
            except Exception:
                # ignore invalid frames
                continue
            tick = counter.on_frame(frame)
            await websocket.send_text(tick.model_dump_json())
    except WebSocketDisconnect:
        # connection closed
        return
