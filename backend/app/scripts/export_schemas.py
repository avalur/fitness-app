from __future__ import annotations

import json
from pathlib import Path

from app.models.schemas import (
    PoseFrame,
    PosePoint,
    ReferenceTemplate,
    UserGoal,
    WorkoutPlan,
)


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    out_dir = root / "shared" / "schemas"
    out_dir.mkdir(parents=True, exist_ok=True)

    models = {
        "user_goal.schema.json": UserGoal,
        "workout_plan.schema.json": WorkoutPlan,
        "pose_point.schema.json": PosePoint,
        "pose_frame.schema.json": PoseFrame,
        "reference_template.schema.json": ReferenceTemplate,
    }
    for name, model in models.items():
        schema = model.model_json_schema()
        with open(out_dir / name, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2)
        print(f"Wrote {name}")


if __name__ == "__main__":
    main()
