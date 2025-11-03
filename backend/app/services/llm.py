from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

from ..models.schemas import UserGoal


def _load_fixture() -> Dict[str, Any]:
    # examples/plan_demo_001.json lives at backend/examples/
    here = Path(__file__).resolve()
    examples_dir = here.parents[2] / "examples"
    fixture_path = examples_dir / "plan_demo_001.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_plan(goal: UserGoal) -> Dict[str, Any]:
    """Return a plan based on goal. For mock provider, return fixture JSON with fresh id/timestamp."""
    provider = os.getenv("LLM_PROVIDER", "mock").lower()
    if provider != "mock":
        # Placeholders for future real providers
        # For now, fallback to mock
        pass

    plan = _load_fixture()
    # Ensure id and created_at reflect this request
    plan["id"] = str(uuid4())
    plan["created_at"] = datetime.utcnow().isoformat() + "Z"
    plan["goal_summary"] = (
        f"{goal.level.title()} {goal.goal.replace('_', ' ')} plan, {goal.days_per_week} days/week"
    )
    return plan
