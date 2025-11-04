from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Literal, Optional

from ..models.schemas import PoseFrame, Tick
from .angles import joint_angle_from_names, get_pt, torso_inclination
from .filters import OneEuro


Phase = Literal["idle", "down", "up"]


@dataclass
class FSMState:
    phase: Phase = "idle"
    last_change_ms: int = 0
    last_down_ms: Optional[int] = None
    last_up_ms: Optional[int] = None


class RepCounter:
    """Deterministic rep counter for push-ups and squats based on angles.

    Heuristics only; meant as a baseline.
    """

    def __init__(self, exercise: Literal["push_up", "squat"], dwell_ms: int = 150):
        self.exercise = exercise
        self.filter = OneEuro(min_cutoff=1.7, beta=0.3)
        self.state = FSMState()
        self.reps = 0
        self.dwell_ms = dwell_ms
        # For squat heel stability proxy
        self._ankle_hist: Deque[float] = deque(maxlen=30)

    def _angles(self, f: PoseFrame) -> Dict[str, Optional[float]]:
        kps = {k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in f.keypoints.items()}
        angles: Dict[str, Optional[float]] = {}
        # Core joints L/R
        angles["elbow_l"] = joint_angle_from_names(kps, "left_shoulder", "left_elbow", "left_wrist")
        angles["elbow_r"] = joint_angle_from_names(kps, "right_shoulder", "right_elbow", "right_wrist")
        angles["knee_l"] = joint_angle_from_names(kps, "left_hip", "left_knee", "left_ankle")
        angles["knee_r"] = joint_angle_from_names(kps, "right_hip", "right_knee", "right_ankle")
        angles["hip_l"] = joint_angle_from_names(kps, "left_shoulder", "left_hip", "left_knee")
        angles["hip_r"] = joint_angle_from_names(kps, "right_shoulder", "right_hip", "right_knee")

        # Torso inclination for push-ups (plank quality proxy)
        ls, rs = get_pt(kps, "left_shoulder"), get_pt(kps, "right_shoulder")
        lh, rh = get_pt(kps, "left_hip"), get_pt(kps, "right_hip")
        if ls and rs and lh and rh:
            angles["torso_incl"] = torso_inclination(ls, rs, lh, rh)
        else:
            angles["torso_incl"] = None
        return angles

    def _update_phase_pushup(self, ang: Dict[str, Optional[float]], t: int) -> List[str]:
        fb: List[str] = []
        # Average elbows
        elbows = [a for a in [ang.get("elbow_l"), ang.get("elbow_r")] if a is not None]
        if not elbows:
            return fb
        elbow = sum(elbows) / len(elbows)

        # Hysteresis thresholds
        down_thr = 70.0
        up_thr = 160.0
        down_enter = down_thr
        up_enter = up_thr

        now_phase = self.state.phase
        if (now_phase in ("up", "idle")) and elbow < down_enter:
            # candidate transition to down
            if t - self.state.last_change_ms >= self.dwell_ms:
                self.state.phase = "down"
                self.state.last_change_ms = t
                self.state.last_down_ms = t
        elif (now_phase == "down") and elbow > up_enter:
            if t - self.state.last_change_ms >= self.dwell_ms:
                self.state.phase = "up"
                self.state.last_change_ms = t
                self.state.last_up_ms = t
                # Count rep when reaching up after a down
                if self.state.last_down_ms is not None:
                    self.reps += 1

        # Quality feedback: torso inclination > ~15° suggests hip sag/bent hips
        incl = ang.get("torso_incl")
        if incl is not None and incl > 15.0:
            fb.append("brace core (hips high)")
        if elbow < 160.0 and now_phase == "up":
            fb.append("lock elbows at top")
        return fb

    def _update_phase_squat(self, ang: Dict[str, Optional[float]], t: int) -> List[str]:
        fb: List[str] = []
        knees = [a for a in [ang.get("knee_l"), ang.get("knee_r")] if a is not None]
        hips = [a for a in [ang.get("hip_l"), ang.get("hip_r")] if a is not None]
        if not knees:
            return fb
        knee = sum(knees) / len(knees)
        hip = sum(hips) / len(hips) if hips else None

        down_cond = knee < 90.0 and (hip is None or hip < 100.0)
        up_cond = knee > 160.0

        now_phase = self.state.phase
        if (now_phase in ("up", "idle")) and down_cond:
            if t - self.state.last_change_ms >= self.dwell_ms:
                self.state.phase = "down"
                self.state.last_change_ms = t
                self.state.last_down_ms = t
        elif (now_phase == "down") and up_cond:
            if t - self.state.last_change_ms >= self.dwell_ms:
                self.state.phase = "up"
                self.state.last_change_ms = t
                self.state.last_up_ms = t
                if self.state.last_down_ms is not None:
                    self.reps += 1

        # Heel stability proxy would use ankle displacement variance; simplified feedback for now
        if knee < 80.0:
            fb.append("depth is good; keep chest up")
        elif knee > 120.0 and now_phase == "down":
            fb.append("go deeper toward parallel")
        return fb

    def on_frame(self, f: PoseFrame) -> Tick:
        angles = self._angles(f)
        filt = self.filter.update(angles, f.ts_ms)
        fb: List[str] = []
        if self.exercise == "push_up":
            fb = self._update_phase_pushup(filt, f.ts_ms)
        else:
            fb = self._update_phase_squat(filt, f.ts_ms)
        return Tick(rep_count=self.reps, phase=self.state.phase, feedback=fb)
