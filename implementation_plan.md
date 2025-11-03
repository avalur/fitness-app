### Purpose
Create a step-by-step, checkbox-driven implementation plan for the browser-based fitness app defined in `prompt.md`. This plan mirrors the milestones (M1–M4), maps each requirement to concrete tasks, and gives the coding agent ready-to-run sequences, definitions of done, and test criteria.

### Key references from prompt.md (for quick lookup)
- Data models spec: lines 54–63
- API spec: lines 64–71
- Rep counting rules: lines 72–77
- Quality analysis: lines 78–84
- Frontend/Backend architecture: lines 31–53
- Acceptance criteria: lines 114–120
- Milestones: lines 121–126
- Example plan JSON: lines 129–150
- Example reference template: lines 154–165

---

### High-level roadmap
- M1: Repo, scaffolding, plan generator stub (backend + frontend boot, CI, DevEx)
- M2: Live pose + rep counting baseline + UI (client-side pose, WebSocket stream, FSM counters)
- M3: Reference templates + DTW analysis + feedback (server analysis path, scoring, tips)
- M4: PWA + accessibility + privacy hardening + docs (offline-first, A11y, legal)

Each milestone section below has: tasks [ ], DoD, and tests.

---

### Repo scaffolding and conventions (applies to all milestones)
- [ ] Monorepo layout
  - `backend/` FastAPI + SQLModel/SQLite + websockets
  - `frontend/` React + Vite + TypeScript + PWA
  - `infra/` Dockerfiles, docker-compose, GitHub Actions
  - `shared/` protocol types (JSON schemas, sample fixtures)
- [ ] Python 3.11, Node 20; `uv` or `pip-tools` for locks; `pnpm` for FE
- [ ] Pre-commit hooks: `black`, `ruff`, `isort`, `mypy` (strict), `eslint`, `prettier`
- [ ] Feature flags (env): `POSE_CLIENT=on|off`, `ANALYSIS_REMOTE=on|off`, `LLM_PROVIDER=openai|vertex|azure|mock`
- [ ] Security defaults: `.env.example`, secrets via env only, CORS origins set, WSS/TLS ready

Definition of Done (Repo):
- [ ] `make up` builds and runs both services via Docker
- [ ] CI green for lint, type check, unit tests

---

### M1 — Scaffolding + Plan Generator Stub
#### Backend (FastAPI)
- [ ] Create app skeleton: `app/main.py`, `app/api`, `app/models`, `app/services`, `app/db.py`
- [ ] Data models (lines 54–63) in Pydantic/SQLModel:
  - [ ] `UserGoal`, `Exercise`, `WorkoutPlan`, `PosePoint`, `PoseFrame`, `Session`, `ReferenceTemplate`
  - [ ] JSON Schema exports under `shared/schemas/*.json`
- [ ] Persistence: SQLite + SQLModel, `alembic` optional
  - [ ] Tables: users, workouts, sessions, reference_templates
- [ ] REST endpoints (lines 64–71):
  - [ ] `POST /plans` → accepts `UserGoal`, returns `WorkoutPlan`
  - [ ] `GET /plans/{id}`
  - [ ] `POST /references` (upsert)
- [ ] LLM wrapper (stubbed): `services/llm.py`
  - [ ] Prompt composer to enforce strict JSON schema (line 86)
  - [ ] `LLM_PROVIDER=mock` returns `examples/plan_demo_001.json` (lines 131–149)
- [ ] Seed fixtures: example plan and reference template (lines 154–165)

#### Frontend (React + Vite + TS)
- [ ] Project boot with routing: `/onboarding`, `/plan`, `/live`, `/history`
- [ ] Types based on shared schemas
- [ ] Onboarding form collects: goal, level, constraints/equipment, days/week (lines 91–95)
- [ ] `POST /plans` integration, render plan JSON with images/explanations

#### DevOps
- [ ] Dockerfiles (multi-stage) for backend and frontend
- [ ] docker-compose for local dev; CORS + reverse proxy `traefik` or `nginx`
- [ ] GitHub Actions: lint, type-check, test, build images

Definition of Done (M1):
- [ ] Plan JSON renders in UI with images/explanations (Acceptance 1)
- [ ] Endpoints live with mock LLM returning valid schema

Tests (M1):
- [ ] Pydantic model validation tests
- [ ] Contract tests for `POST /plans` and `GET /plans/{id}`

---

### M2 — Client-side Pose + Real-time Rep Counting + UI
#### Frontend — Pose and streaming
- [ ] Camera pipeline:
  - [ ] Prompt user; `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`
  - [ ] Mobile iOS gesture start + autoplay restrictions handled
- [ ] Pose estimator (client-first; lines 35–37): choose one path, keep feature flag
  - [ ] Option A (default): MediaPipe Tasks Pose Landmarker (WASM/WebGPU)
  - [ ] Option B (fallback): TF.js MoveNet Lightning
- [ ] Performance:
  - [ ] Run inference in `WebWorker`/`OffscreenCanvas`
  - [ ] Throttle to ~30 FPS; measure per-frame latency; goal median < 120 ms (line 100)
- [ ] Normalization:
  - [ ] Convert raw landmarks → `PoseFrame { ts_ms, keypoints{name: PosePoint} }` (lines 59–61)
  - [ ] Normalize to video frame size; include `score`
- [ ] WebSocket client → `wss:///ws/session` (line 41)
  - [ ] Send frames (keypoints only) at 15–30 Hz; backpressure handling
  - [ ] Receive ticks: `{ rep_count, phase, feedback[] }` (line 69)
- [ ] Live UI (lines 38, 92):
  - [ ] Camera preview overlay
  - [ ] Big rep counter
  - [ ] Traffic-light technique bar
  - [ ] Instant tips text area

#### Backend — Session WS + Rep FSM
- [ ] WebSocket endpoint `/ws/session`
  - [ ] Accept stream of `PoseFrame`
  - [ ] Per-connection state: filters, FSM states, last timestamps
- [ ] Angle math utilities:
  - [ ] Joint angle `∠ABC` from joints A-B-C; torso inclination from shoulders–hips line
  - [ ] 1-Euro filter for angles (line 76)
- [ ] Rep FSMs (deterministic baselines; lines 72–76)
  - Push-ups:
    - [ ] Elbow angle down < 70°, up > 160°, hysteresis + dwell ≥ 150 ms
    - [ ] Reject if hip sag: deviation of hip–shoulder line above θ (configurable)
  - Squats:
    - [ ] Knee < 90° and hip < 100° for down; knee > 160° for up
    - [ ] Heel stability proxy: ankle displacement variance threshold
- [ ] Dropped frames handling; sampling to 30 Hz nominal; smoothing
- [ ] Metrics logging per session: fps, latency, rejected reps, warnings

Pseudo-code sketch (rep FSM):
```python
class RepCounter:
    def on_frame(self, f: PoseFrame) -> Tick:
        angles = compute_angles(f.keypoints)
        angles = self.filter.update(angles, f.ts_ms)
        state = self.state_machine.update(angles, f.ts_ms)
        feedback = self.rules.check(angles, state)
        return Tick(rep_count=self.reps, phase=state.phase, feedback=feedback)
```

Definition of Done (M2):
- [ ] Live rep counting works for push-ups & squats on demo feeds
- [ ] Median latency < 120 ms laptop, p95 < 200 ms; mobile median < 200 ms (line 100)

Tests (M2):
- [ ] Synthetic keypoint generators for push-up, squat (lines 97–99)
- [ ] Unit tests for angle math, 1-Euro filter, FSM transitions
- [ ] Playback of test clips → ≥95% counting accuracy (Acceptance 2)

---

### M3 — Reference Templates, DTW Analysis, Scoring, Feedback
#### Data and APIs
- [ ] `POST /references` stores `ReferenceTemplate` with `joint_angles`, `phase_labels`, `fps` (lines 62, 68)
- [ ] `POST /analyze` accepts `{ frames: PoseFrame[], exercise_id }` and returns `{ score, issues[], timeline_annotations[] }` (line 70)

#### Analysis engine
- [ ] Preprocessing:
  - [ ] Extract per-frame angle vectors per exercise
  - [ ] Normalize time to nominal 30 Hz; handle gaps
- [ ] Temporal alignment:
  - [ ] DTW to align user angle sequence to reference (line 80)
  - [ ] Cache warping path per set
- [ ] Metrics (lines 81–82):
  - [ ] Depth adequacy (e.g., min elbow/knee angle vs threshold)
  - [ ] ROM symmetry L/R (|L−R|/max ≤ δ)
  - [ ] Tempo consistency (variance vs target; e.g., “3-0-1” → 3 s eccentric)
  - [ ] Joint stacking and back neutrality (angle bounds)
- [ ] Scoring 0–100:
  - [ ] Weighted rubric: depth 35, tempo 25, symmetry 20, stacking 20
  - [ ] Penalties for safety violations (cap max score)
- [ ] Feedback rules (rule-first, ML-ready; line 83):
  - [ ] Map metric breaches → human tips
  - [ ] Examples: “widen stance by ~5–10 cm”, “slow eccentric to 2 s”, “lock elbows at top”

Definition of Done (M3):
- [ ] `POST /analyze` returns stable scores and ≥3 actionable tips when form deviates (Acceptance 3)
- [ ] Demo reference templates for push-up and squat available (Acceptance 110)

Tests (M3):
- [ ] Unit tests for DTW alignment and scoring rubric
- [ ] Golden metrics on curated traces (regression-safe)

---

### M4 — PWA, Accessibility, Privacy, Docs
#### PWA & Offline (lines 25, 94, 118)
- [ ] Service Worker: cache plan JSON and images; stale-while-revalidate
- [ ] IndexedDB for session summaries queue; sync on reconnect
- [ ] Manifest: name, icons, display=standalone; install banners

#### Accessibility (lines 29, 90–95)
- [ ] Captions for feedback; ARIA live regions for tips
- [ ] Reduced motion mode; font scaling; color contrast ≥ WCAG AA

#### Privacy & Security (lines 102–105, 119–120)
- [ ] Default: no raw video leaves device; only keypoints sent (documented)
- [ ] Opt-in toggle for cloud analysis; per-session consent logged
- [ ] Data export/delete endpoints (GDPR/CCPA-ready)
- [ ] WSS with TLS; secure cookies or JWT; anonymize session metrics

#### Documentation & Demo
- [ ] README with run scripts, acceptance checklist, architecture diagrams
- [ ] E2E demo page: quick start → generate plan → live session → technique report

Definition of Done (M4):
- [ ] PWA installable on Mobile Safari/Chrome and desktop Chrome/Firefox (Acceptance 4)
- [ ] Privacy defaults satisfied (Acceptance 5)

Tests (M4):
- [ ] Lighthouse PWA and A11y ≥ 90
- [ ] Playwright E2E happy path

---

### Detailed task breakdown (coding agent checklist)
#### 0. Bootstrapping
- [ ] Initialize repo with MIT license, CODEOWNERS, PR template
- [ ] Create `make` targets: `make dev`, `make test`, `make up`, `make down`

#### 1. Backend foundations
- [ ] `backend/app/models/schemas.py`: Pydantic models per lines 54–63
- [ ] `backend/app/db.py`: SQLModel engine, session dependency
- [ ] `backend/app/api/routers/plans.py`: `POST /plans`, `GET /plans/{id}`
- [ ] `backend/app/api/routers/references.py`: `POST /references`
- [ ] `backend/app/api/routers/analyze.py`: `POST /analyze`
- [ ] `backend/app/api/ws/session.py`: `/ws/session`
- [ ] `backend/app/services/rep_counter.py`: push-up/squat FSM + filters
- [ ] `backend/app/services/quality.py`: DTW + metrics + scoring + feedback
- [ ] `backend/app/services/llm.py`: provider wrapper + mock

#### 2. Frontend foundations
- [ ] `frontend/src/types/*.ts`: types from JSON schema
- [ ] `frontend/src/pages/Onboarding.tsx`
- [ ] `frontend/src/pages/Plan.tsx`
- [ ] `frontend/src/pages/Live.tsx`
- [ ] `frontend/src/pages/History.tsx`
- [ ] `frontend/src/lib/pose/client.ts`: MediaPipe/MoveNet loader
- [ ] `frontend/src/lib/ws.ts`: WebSocket client with backpressure
- [ ] `frontend/src/components/RepCounterHUD.tsx`

#### 3. Protocols & fixtures
- [ ] `shared/schemas/*.json` generated from Pydantic
- [ ] `shared/fixtures/plan_demo_001.json` (lines 131–149)
- [ ] `shared/fixtures/ref_pushup_v1.json` (lines 156–165)
- [ ] Sample WebSocket messages

Sample payloads:
```json
// PoseFrame → server
{
  "ts_ms": 1730136000000,
  "keypoints": {
    "left_shoulder": {"x":0.41,"y":0.32,"score":0.98},
    "left_elbow": {"x":0.45,"y":0.45,"score":0.96}
  }
}
```
```json
// Tick ← server
{"rep_count": 7, "phase": "up", "feedback": ["lock elbows", "brace core"]}
```

#### 4. Rep counting details (deterministic)
- [ ] Angle computation from 2D normalized keypoints
- [ ] 1-Euro filter params: `min_cutoff=1.7`, `beta=0.3` (tunable)
- [ ] Push-up thresholds: `down<70°`, `up>160°`, dwell ≥150 ms, hip sag θ≈12–15°
- [ ] Squat thresholds: knee<90°, hip<100°, up when knee>160°; ankle variance limit
- [ ] Hysteresis implementation to avoid chatter
- [ ] Unit tests with synthetic sequences + noisy perturbations

#### 5. DTW & scoring details
- [ ] Use `fastdtw` or custom O(NM) with Sakoe-Chiba band; cache
- [ ] Normalize angle vectors (z-score per-joint or min-max) before DTW
- [ ] Compute metrics and map to tips; author tip text library

#### 6. Performance & telemetry
- [ ] FE: measure render + inference + WS send times
- [ ] BE: per-connection loop time; p50/p95 TS dashboards (stdout + JSON logs)

#### 7. PWA & A11y
- [ ] Service worker `workbox` with runtime caching for images/JSON
- [ ] Manifest, icons; install prompt
- [ ] A11y audits; reduced motion, color contrast tokens

#### 8. Privacy & compliance
- [ ] Keypoints-only transport (no frames); document
- [ ] Consent toggle and audit log
- [ ] Data export/delete endpoints

---

### Testing strategy summary (mapped to Acceptance)
- Acceptance 1: FE renders plan JSON → UI snapshot tests + contract tests
- Acceptance 2: Rep counting ≥95% on test clips → CI job runs playback + asserts
- Acceptance 3: Technique report with ≥3 tips → unit + golden tests for feedback
- Acceptance 4: PWA install across browsers → Playwright device matrix
- Acceptance 5: Privacy → e2e tests verify no image/video POSTs unless opted-in

---

### Risks and mitigations
- Mobile performance: prefer MoveNet Lightning or MediaPipe WASM+SIMD; degrade FPS gracefully
- WebAssembly features: prepare non-SIMD fallback; feature flag
- Pose instability/occlusion: 1-Euro smoothing + rep hysteresis; widen thresholds
- iOS camera constraints: require user gesture; handle page visibility pause/resume
- Privacy: explicit consent gates; telemetry anonymization verified in tests

---

### Definition of Done (global)
- [ ] All milestones’ DoD items checked
- [ ] CI green; Docker images build; `make up` works
- [ ] README has run scripts and acceptance checklist

### Next action for the coding agent (today)
- [ ] Initialize monorepo with folders/files above
- [ ] Implement Pydantic models + schema export
- [ ] Build mock `POST /plans` returning the provided example JSON
- [ ] Create FE onboarding + plan render page wired to backend