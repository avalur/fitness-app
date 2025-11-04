export type Tick = { rep_count: number; phase: 'idle' | 'down' | 'up'; feedback: string[] }

export interface WSClientOptions {
  url?: string // e.g., ws://localhost:8000/ws/session
  exercise?: 'push_up' | 'squat'
  maxBufferedBytes?: number
}

export class WSClient {
  private ws: WebSocket | null = null
  private url: string
  private exercise: 'push_up' | 'squat'
  private maxBufferedBytes: number
  onTick: ((tick: Tick) => void) | null = null
  onOpen: (() => void) | null = null
  onClose: (() => void) | null = null

  constructor(opts?: WSClientOptions) {
    const base = opts?.url || inferWSURL()
    const ex = opts?.exercise || 'push_up'
    this.url = `${base}?exercise=${encodeURIComponent(ex)}`
    this.exercise = ex
    this.maxBufferedBytes = opts?.maxBufferedBytes ?? 512 * 1024 // 512KB
  }

  connect() {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => this.onOpen?.()
    this.ws.onclose = () => this.onClose?.()
    this.ws.onmessage = ev => {
      try {
        const tick = JSON.parse(ev.data) as Tick
        this.onTick?.(tick)
      } catch {
        // ignore
      }
    }
  }

  send(frame: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    // Backpressure: if outgoing buffer too large, drop this frame
    // @ts-ignore
    if ((this.ws as any).bufferedAmount && (this.ws as any).bufferedAmount > this.maxBufferedBytes) {
      return
    }
    this.ws.send(JSON.stringify(frame))
  }

  close() {
    this.ws?.close()
  }
}

function inferWSURL(): string {
  const loc = window.location
  const proto = loc.protocol === 'https:' ? 'wss' : 'ws'
  // Backend default dev port assumed 8000
  const port = loc.port === '5173' ? '8000' : loc.port
  return `${proto}://${loc.hostname}:${port}/ws/session`
}
