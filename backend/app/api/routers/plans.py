from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from ...db import get_session
from ...models.schemas import PlanRow, UserGoal, WorkoutPlan
from ...services.llm import generate_plan

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("/", response_model=WorkoutPlan)
def create_plan(goal: UserGoal) -> WorkoutPlan:
    """Generate a workout plan from a user goal (mock LLM for now)."""
    plan_dict: dict[str, Any] = generate_plan(goal)
    try:
        plan = WorkoutPlan(**plan_dict)
    except Exception as e:  # validation error
        raise HTTPException(status_code=500, detail=f"Invalid plan format: {e}")

    with get_session() as session:
        row = PlanRow(
            id=plan.id,
            created_at=datetime.utcnow(),
            user_goal_json=goal.model_dump_json(),
            plan_json=plan.model_dump_json(),
        )
        session.add(row)
        session.commit()

    return plan


@router.get("/{plan_id}", response_model=WorkoutPlan)
def get_plan(plan_id: str) -> WorkoutPlan:
    with get_session() as session:
        row = session.get(PlanRow, plan_id)
        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")
        data = json.loads(row.plan_json)
        return WorkoutPlan(**data)
