/* Minimal client-side pose wrapper using TF.js MoveNet Lightning.
 * Feature-flag with POSE_CLIENT env if needed later. Runs inference on the UI thread for simplicity; can be
 * moved to a Worker in M2.1.
 */

// Lazy imports to keep initial bundle slim
let detector: any | null = null
let pd: any | null = null
let tfcore: any | null = null
let tfwebgl: any | null = null

export type Keypoint = { x: number; y: number; score?: number }
export type PoseFrame = { ts_ms: number; keypoints: Record<string, Keypoint> }

export interface PoseClientOptions {
  targetFPS?: number // throttle
}

export interface PoseClient {
  start: () => Promise<void>
  stop: () => void
  onFrame: (cb: (f: PoseFrame) => void) => void
  isRunning: () => boolean
}

export async function createPoseClient(video: HTMLVideoElement, opts?: PoseClientOptions): Promise<PoseClient> {
  const fps = Math.min(60, Math.max(5, opts?.targetFPS ?? 30))
  await ensureDetector()
  let running = false
  let handle = 0
  let lastTs = 0
  let cb: ((f: PoseFrame) => void) | null = null

  async function loop() {
    if (!running || !video || video.readyState < 2) {
      handle = requestAnimationFrame(loop)
      return
    }
    const now = performance.now()
    if (now - lastTs < 1000 / fps) {
      handle = requestAnimationFrame(loop)
      return
    }
    lastTs = now
    try {
      const poses = await detector!.estimatePoses(video, { flipHorizontal: true })
      const keypoints = poses?.[0]?.keypoints || []
      const mapped: Record<string, Keypoint> = {}
      for (const k of keypoints) {
        // Map to names that match backend expectations (COCO keypoints mapped to body joints)
        const name = mapKeypointName(k.name || k.part)
        if (!name) continue
        // TF.js provides absolute pixels; normalize to 0..1
        const x = k.x / (video.videoWidth || 1)
        const y = k.y / (video.videoHeight || 1)
        mapped[name] = { x, y, score: k.score }
      }
      // Only emit if we have the core joints
      if (Object.keys(mapped).length > 0 && cb) {
        cb({ ts_ms: Date.now(), keypoints: mapped })
      }
    } catch (e) {
      // swallow; try next frame
    }
    handle = requestAnimationFrame(loop)
  }

  return {
    async start() {
      if (running) return
      running = true
      handle = requestAnimationFrame(loop)
    },
    stop() {
      running = false
      if (handle) cancelAnimationFrame(handle)
    },
    onFrame(fn) {
      cb = fn
    },
    isRunning() {
      return running
    },
  }
}

async function ensureDetector() {
  if (detector) return
  // Dynamic imports
  // @ts-ignore
  pd = await import('@tensorflow-models/pose-detection')
  // @ts-ignore
  tfcore = await import('@tensorflow/tfjs-core')
  // @ts-ignore
  tfwebgl = await import('@tensorflow/tfjs-backend-webgl')
  await tfcore.setBackend('webgl')
  await tfcore.ready()
  detector = await pd.createDetector(pd.SupportedModels.MoveNet, {
    modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  })
}

function mapKeypointName(name?: string): string | null {
  if (!name) return null
  // Normalize common names to our expected keys
  const n = name.toLowerCase()
  const map: Record<string, string> = {
    'left_shoulder': 'left_shoulder',
    'right_shoulder': 'right_shoulder',
    'left_elbow': 'left_elbow',
    'right_elbow': 'right_elbow',
    'left_wrist': 'left_wrist',
    'right_wrist': 'right_wrist',
    'left_hip': 'left_hip',
    'right_hip': 'right_hip',
    'left_knee': 'left_knee',
    'right_knee': 'right_knee',
    'left_ankle': 'left_ankle',
    'right_ankle': 'right_ankle',
  }
  if (map[n]) return map[n]
  // PoseDetection may use camelCase part names
  const alt: Record<string, string> = {
    leftShoulder: 'left_shoulder',
    rightShoulder: 'right_shoulder',
    leftElbow: 'left_elbow',
    rightElbow: 'right_elbow',
    leftWrist: 'left_wrist',
    rightWrist: 'right_wrist',
    leftHip: 'left_hip',
    rightHip: 'right_hip',
    leftKnee: 'left_knee',
    rightKnee: 'right_knee',
    leftAnkle: 'left_ankle',
    rightAnkle: 'right_ankle',
  }
  // @ts-ignore
  return alt[name] || null
}
