from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException

from ...db import get_session
from ...models.schemas import ReferenceTemplate, ReferenceTemplateRow

router = APIRouter(prefix="/references", tags=["references"])


@router.post("/")
def upsert_reference(ref: ReferenceTemplate) -> dict[str, Any]:
    with get_session() as session:
        row = session.get(ReferenceTemplateRow, ref.id)
        if row is None:
            row = ReferenceTemplateRow(
                id=ref.id,
                exercise_id=ref.exercise_id,
                name=ref.name,
                fps=ref.fps,
                phase_labels_json=json.dumps(ref.phase_labels),
                joint_angles_json=json.dumps(ref.joint_angles),
            )
            session.add(row)
        else:
            row.exercise_id = ref.exercise_id
            row.name = ref.name
            row.fps = ref.fps
            row.phase_labels_json = json.dumps(ref.phase_labels)
            row.joint_angles_json = json.dumps(ref.joint_angles)
        session.commit()
    return {"status": "ok", "id": ref.id}
