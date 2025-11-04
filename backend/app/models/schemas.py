from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl, conint
from sqlmodel import Field as SQLField, SQLModel


# ---------- Pydantic domain models (JSON schemas exported for FE) ----------

Level = Literal["beginner", "intermediate", "advanced"]
Goal = Literal["fat_loss", "muscle_gain", "endurance", "general_fitness"]


class UserGoal(BaseModel):
    goal: Goal
    level: Level
    constraints: Optional[str] = None
    equipment: List[str] = []
    days_per_week: conint(ge=1, le=7) = 3


class PlanExercise(BaseModel):
    name: str
    sets: conint(ge=1) = 3
    reps: str = "10-12"  # could be tempo or range
    rest_seconds: conint(ge=0) = 60
    image_url: Optional[HttpUrl] = None
    explanation: Optional[str] = None


class PlanDay(BaseModel):
    day: conint(ge=1, le=7)
    focus: Optional[str] = None
    exercises: List[PlanExercise] = []


class WorkoutPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = "Personalized Workout Plan"
    goal_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    days: List[PlanDay]


class PosePoint(BaseModel):
    x: float
    y: float
    score: Optional[float] = None


class PoseFrame(BaseModel):
    ts_ms: int
    keypoints: Dict[str, PosePoint]


class Tick(BaseModel):
    rep_count: int = 0
    phase: Literal["idle", "down", "up"] = "idle"
    feedback: List[str] = []


class ReferenceTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    exercise_id: str
    name: str
    fps: int = 30
    phase_labels: List[str] = []
    # Simplified representation: each frame has a flat angle vector
    joint_angles: List[List[float]] = []


# ---------- Persistence (SQLModel tables) ----------


class PlanRow(SQLModel, table=True):
    id: str = SQLField(primary_key=True, index=True)
    created_at: datetime
    # Store the canonical goal request and plan as JSON strings
    user_goal_json: str
    plan_json: str


class ReferenceTemplateRow(SQLModel, table=True):
    id: str = SQLField(primary_key=True, index=True)
    exercise_id: str = SQLField(index=True)
    name: str
    fps: int
    phase_labels_json: str
    joint_angles_json: str
