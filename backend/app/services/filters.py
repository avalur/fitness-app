from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict


def _alpha(cutoff: float, dt: float) -> float:
    tau = 1.0 / (2.0 * math.pi * cutoff)
    return 1.0 / (1.0 + tau / dt) if dt > 0 else 1.0


@dataclass
class LowPass:
    y: float | None = None
    a: float = 0.0

    def filter(self, x: float, a: float) -> float:
        if self.y is None:
            self.y = x
        self.a = a
        self.y = self.a * x + (1 - self.a) * self.y
        return self.y


class OneEuro:
    """1-Euro filter for smoothing angle streams.

    Reference: https://cristal.univ-lille.fr/~casiez/1euro/
    """

    def __init__(self, min_cutoff: float = 1.7, beta: float = 0.3, d_cutoff: float = 1.0):
        self.min_cutoff = float(min_cutoff)
        self.beta = float(beta)
        self.d_cutoff = float(d_cutoff)
        self._x_prev: Dict[str, LowPass] = {}
        self._dx_prev: Dict[str, LowPass] = {}
        self._t_prev: float | None = None

    def reset(self) -> None:
        self._x_prev.clear()
        self._dx_prev.clear()
        self._t_prev = None

    def update(self, angles: Dict[str, float | None], t_ms: int) -> Dict[str, float | None]:
        t = t_ms / 1000.0
        if self._t_prev is None:
            dt = 1.0 / 30.0
        else:
            dt = max(1e-3, t - self._t_prev)
        self._t_prev = t

        out: Dict[str, float | None] = {}
        for name, x in angles.items():
            if x is None:
                out[name] = None
                continue
            # Estimate derivative
            prev = self._x_prev.setdefault(name, LowPass())
            dx_prev = self._dx_prev.setdefault(name, LowPass())
            dx = (x - (prev.y if prev.y is not None else x)) / dt
            edx = dx_prev.filter(dx, _alpha(self.d_cutoff, dt))
            # Compute cutoff
            cutoff = self.min_cutoff + self.beta * abs(edx)
            out[name] = prev.filter(x, _alpha(cutoff, dt))
        return out
