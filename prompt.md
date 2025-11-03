### Task

Write a development plan for a browser-based fitness application in Python that works on a laptop, phone, and iPad and does the following:

1. Builds a personalized workout program to achieve the stated goal (lose weight / strengthen back or neck muscles / gain muscle mass etc.), including explanations and pictures.
2. Then, in real time, records the user’s sessions via a webcam, recognizes movements of arms, legs, and torso, and, as a first step, automatically counts the number of push-ups and squats.
3. Next, analyzes the quality of a specific exercise execution by comparing it with a preloaded/created reference.
4. You may use any LLM APIs most suitable for this task.

---

### Details

**Role:** You are a senior full-stack Python engineer and computer-vision researcher specialized in human pose estimation and real-time exercise analytics.

**Objective:** Deliver a cross-device browser app (laptop/phone/iPad) with a Python backend that:

* (A) generates goal-oriented workout plans with explanations and images,
* (B) performs real-time webcam tracking and auto-counts push-ups & squats,
* (C) evaluates technique by comparing against reference motion templates,
* (D) can leverage any suitable LLM APIs.

**Non-negotiable constraints:**

* Frontend: runs in a standard browser; responsive, PWA-capable (installable, offline for plan viewing)
* Backend: Python (FastAPI)
* Real-time: ≤150 ms processing per frame on typical laptop; mobile-friendly pathway
* Privacy: process raw video locally when possible; send only keypoints/angles to server
* Accessibility: captions, reduced-motion mode, font scaling, color-contrast ≥ WCAG AA

**System architecture (propose and implement):**

* Frontend (TS/React or Svelte):

  * Use MediaDevices.getUserMedia for webcam.
  * Client-side pose estimation first (MediaPipe Tasks in WebAssembly/WebGPU or TF.js MoveNet).
  * Send only normalized keypoints + timestamps via WebSocket to the backend for counting/quality checks.
  * Render rep counter, live feedback cues (“deeper squat”, “lock elbows”, etc.).
* Backend (Python/FastAPI):

  * WebSocket endpoint `/ws/session` for keypoint streams
  * REST endpoints for plans, references, sessions (see API spec below)
  * LLM endpoint wrapper to generate workouts (prompts with goal, level, injuries)
  * Quality analysis engine: angle sequences + DTW/temporal alignment vs. reference templates; rule-based warnings with optional ML classifier
* Storage:
  * sqlite (users, workouts, sessions, reference_templates)
  * local storage for static images (exercise illustrations)
* Model serving:
  * Prefer client-side pose; provide server fallback (PyTorch + TorchScript/OpenVINO) only for desktops
* DevOps:
  * Docker for backend; CI with tests; pre-commit hooks (black/isort/ruff/mypy)
  * Feature flags to switch between client/server pose estimation

**Data models (Python/Pydantic, implement):**

* `UserGoal { goal: Enum('lose_weight','back_strength','neck_strength','gain_mass'), level: Enum('beginner','intermediate','advanced'), constraints: list[str] }`
* `Exercise { id:str, name:str, muscle_groups:list[str], steps:list[str], image_url:str, video_url:Optional[str], reps:int, sets:int, tempo:str, rest_sec:int }`
* `WorkoutPlan { id:str, user_id:str, goal:UserGoal, days_per_week:int, schedule:dict[weekday, list[Exercise]], notes:str }`
* `PosePoint { x:float, y:float, score:float }`
* `PoseFrame { ts_ms:int, keypoints:dict[str, PosePoint] }`  // e.g., 33 COCO/BlazePose joints
* `Session { id:str, user_id:str, started_at:datetime, exercise_id:str, reps:int, frames_count:int, metrics:dict }`
* `ReferenceTemplate { id:str, exercise_id:str, joint_angles:list[float], phase_labels:list[str], fps:int, metadata:dict }`

**API (implement minimal set):**

* `POST /plans` – input: `UserGoal`; output: `WorkoutPlan` (LLM-assisted).
* `GET /plans/{id}` – returns plan.
* `POST /references` – create/update `ReferenceTemplate`.
* `WS /ws/session` – input: stream of `PoseFrame`; output: JSON ticks `{rep_count:int, phase:str, feedback:str[]}`.
* `POST /analyze` – input: `{frames: PoseFrame[], exercise_id}`; output: `{score:0..100, issues:str[], timeline_annotations:[{t, note}]}`.

**Rep counting (implement deterministic baseline):**

* Push-ups: compute elbow angle (shoulder–elbow–wrist) and torso inclination; detect down/up phases with hysteresis on angle thresholds (e.g., down < 70°, up > 160°), minimal dwell time 150 ms, reject reps if hip sag (hip–shoulder line deviation > θ).
* Squats: knee and hip angles; down when knee < 90° and hip < 100°, up when knee > 160°; require heel stability proxy (ankle displacement variance).
* Smoothing: 1-Euro filter on angles; 30 Hz nominal; handle dropped frames.

**Quality analysis (implement):**

* Normalize sequences (time-warp to reference via DTW).
* Metrics: depth adequacy, ROM symmetry L/R, tempo consistency, joint stacking, back neutrality.
* Output: overall score 0–100 + labeled issues with remediation tips (“widen stance by ~5–10 cm”, “slow eccentric to 2 s”).
* Keep a rule-based engine first; allow future ML classifier plug-in.

**LLM usage:**
* Plan generator prompt: include user goal, level, days/week, available equipment, injury flags; return strict JSON (`WorkoutPlan`).
* Image generation (optional): create step-by-step illustrations; fallback to curated static images.
* Safety: never give medical advice; include warm-up/cool-down; disclaimers.

**Frontend UX:**
* Onboarding questionnaire (goal, level, equipment, injuries, days/week).
* Live session screen: camera preview, big rep counter, traffic-light technique bar, instant tips.
* History: per-exercise PRs, technique trend charts.
* Offline: cache current plan/images; queue session summaries for sync.

**Testing & metrics:**
* Unit tests for angle math, rep FSM, DTW alignment.
* Synthetic keypoint generators for CI.
* Target accuracy: ≥95% rep counting on clean webcam; ≥85% under moderate occlusion.
* Latency targets: median <120 ms, p95 <200 ms on laptop; <200/300 ms on modern phones.

**Security & privacy:**
* No raw video uploaded by default; opt-in for cloud analysis.
* Anonymize session metrics; GDPR/CCPA-ready data export/delete.

**Deliverables:**

* Monorepo scaffold with `backend/`, `frontend/`, `infra/`.
* Pydantic models, FastAPI routes, WebSocket service, rep counter & analysis modules.
* Demo reference templates for push-up & squat (JSON).
* E2E demo page + seed fixtures.
* README with run scripts and acceptance checklist.

**Acceptance criteria (must pass):**
1. Plan JSON validates and renders in UI with images/explanations.
2. Live rep counting works for push-ups & squats with ≥95% accuracy on provided test clips.
3. Technique report shows score + ≥3 actionable tips when form deviates from reference.
4. Mobile Safari/Chrome and desktop Chrome/Firefox supported; PWA install works.
5. No raw video leaves device unless user opts in; only keypoints sent.

**Milestones:**
* M1: Repo + scaffolding + plan generator stub.
* M2: Live pose + rep counting baseline + UI.
* M3: Reference templates + Dynamic Time Warping analysis + feedback.
* M4: Progressive Web App + accessibility + privacy hardening + docs.

---

### Examples for LLM (JSON)

```json
{
  "id": "plan_demo_001",
  "user_id": "u123",
  "goal": {"goal": "back_strength", "level": "intermediate", "constraints": ["no barbell"]},
  "days_per_week": 3,
  "schedule": {
    "Mon": [
      {"id":"ex_pushup","name":"Push-ups","muscle_groups":["chest","triceps","core"],"steps":["Plank","Lower","Press"],"image_url":"https://.../pushup.png","reps":12,"sets":3,"tempo":"2-1-1","rest_sec":90}
    ],
    "Wed": [
      {"id":"ex_squat","name":"Bodyweight Squat","muscle_groups":["quads","glutes","core"],"steps":["Stand","Lower to 90°","Rise"],"image_url":"https://.../squat.png","reps":15,"sets":3,"tempo":"3-0-1","rest_sec":90}
    ],
    "Fri": [
      {"id":"ex_bird_dog","name":"Bird-Dog","muscle_groups":["back","core"],"steps":["Extend opposite arm/leg","Hold","Switch"],"image_url":"https://.../birddog.png","reps":10,"sets":3,"tempo":"2-2-1","rest_sec":60}
    ]
  },
  "notes": "Warm-up 5–7 min; cool-down 5 min; stop if pain."
}
```

---

### Reference for push-ups

```json
{
  "id": "ref_pushup_v1",
  "exercise_id": "ex_pushup",
  "fps": 30,
  "joint_angles": [145,140,120,80,70,75,90,120,150,165],
  "phase_labels": ["up","up","down","down","bottom","up","up","up","lockout","lockout"],
  "metadata": {"source":"coach_recording","notes":"neutral spine, feet hip-width"}
}
```
