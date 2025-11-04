from __future__ import annotations

from math import acos, degrees, sqrt, atan2
from typing import Dict, Tuple


def _vec(a: Tuple[float, float], b: Tuple[float, float]) -> Tuple[float, float]:
    return (a[0] - b[0], a[1] - b[1])


def _norm(v: Tuple[float, float]) -> float:
    return sqrt(v[0] * v[0] + v[1] * v[1])


def angle_abc(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """Return the internal angle ∠ABC in degrees using points A-B-C (B is the vertex).

    Coordinates are expected to be normalized video coordinates in [0,1], with origin at top-left.
    """
    ba = _vec(a, b)
    bc = _vec(c, b)
    nba = _norm(ba)
    nbc = _norm(bc)
    if nba == 0 or nbc == 0:
        return 180.0
    cosang = max(-1.0, min(1.0, (ba[0] * bc[0] + ba[1] * bc[1]) / (nba * nbc)))
    return degrees(acos(cosang))


def torso_inclination(left_shoulder: Tuple[float, float], right_shoulder: Tuple[float, float],
                      left_hip: Tuple[float, float], right_hip: Tuple[float, float]) -> float:
    """Return torso inclination angle in degrees relative to horizontal using the line
    between mid-shoulders and mid-hips. 0 deg = horizontal, positive = hip point is lower.
    """
    mx_shoulders = ((left_shoulder[0] + right_shoulder[0]) / 2.0, (left_shoulder[1] + right_shoulder[1]) / 2.0)
    mx_hips = ((left_hip[0] + right_hip[0]) / 2.0, (left_hip[1] + right_hip[1]) / 2.0)
    dx = mx_hips[0] - mx_shoulders[0]
    dy = mx_hips[1] - mx_shoulders[1]
    # atan2 returns angle vs x-axis; convert to degrees and absolute inclination
    return abs(degrees(atan2(dy, dx)))


def get_pt(kps: Dict[str, dict], name: str) -> Tuple[float, float] | None:
    kp = kps.get(name)
    if not kp:
        return None
    return (float(kp.get("x", 0.0)), float(kp.get("y", 0.0)))


def joint_angle_from_names(keypoints: Dict[str, dict], a: str, b: str, c: str) -> float | None:
    pa, pb, pc = get_pt(keypoints, a), get_pt(keypoints, b), get_pt(keypoints, c)
    if pa is None or pb is None or pc is None:
        return None
    return angle_abc(pa, pb, pc)
