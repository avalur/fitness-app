import React, { useEffect, useRef, useState } from 'react'
import useUserMedia from '../lib/useUserMedia'
import { createPoseClient, PoseFrame } from '../lib/pose/client'
import { WSClient, Tick } from '../lib/ws'
import RepCounterHUD from '../components/RepCounterHUD'

export default function Live() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { stream, start, stop, isActive, error } = useUserMedia({ resolution: '720p', facingMode: 'user' })
  const [exercise, setExercise] = useState<'push_up' | 'squat'>('push_up')
  const [ws, setWs] = useState<WSClient | null>(null)
  const [reps, setReps] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'down' | 'up'>('idle')
  const [tips, setTips] = useState<string[]>([])
  const poseClientRef = useRef<Awaited<ReturnType<typeof createPoseClient>> | null>(null)

  // Attach stream to video
  useEffect(() => {
    const node = videoRef.current
    if (!node) return
    if (stream) {
      // @ts-ignore
      node.srcObject = stream
      node.muted = true
      node.playsInline = true
      node.autoplay = true
    }
  }, [stream])

  // Manage WS connection when exercise changes
  useEffect(() => {
    const client = new WSClient({ exercise })
    client.onTick = (t: Tick) => {
      setReps(t.rep_count)
      setPhase(t.phase)
      setTips(t.feedback || [])
    }
    client.connect()
    setWs(client)
    return () => client.close()
  }, [exercise])

  // Start camera + pose on button click (iOS gesture safe)
  const onStart = async () => {
    await start({ resolution: '720p', facingMode: 'user' })
    if (videoRef.current && !poseClientRef.current) {
      const pc = await createPoseClient(videoRef.current, { targetFPS: 30 })
      pc.onFrame((f: PoseFrame) => {
        ws?.send(f)
        // Optional: draw minimal landmark dots
        drawDots(f)
      })
      await pc.start()
      poseClientRef.current = pc
    }
  }

  const onStop = () => {
    poseClientRef.current?.stop()
    stop()
  }

  function drawDots(f: PoseFrame) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const w = (canvas.width = video.clientWidth)
    const h = (canvas.height = video.clientHeight)
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#00d1b2'
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    for (const kp of Object.values(f.keypoints)) {
      const x = kp.x * w
      const y = kp.y * h
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Live Session</h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={onStart} disabled={isActive}>
          Start Session
        </button>
        <button onClick={onStop} disabled={!isActive}>
          Stop Session
        </button>
        <label>
          Exercise{' '}
          <select value={exercise} onChange={e => setExercise(e.target.value as any)}>
            <option value="push_up">Push-up</option>
            <option value="squat">Squat</option>
          </select>
        </label>
        {error && <span style={{ color: 'red' }}>{error}</span>}
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 960,
          aspectRatio: '16 / 9',
          background: '#111',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)' }} />
        <RepCounterHUD reps={reps} phase={phase} tips={tips} />
      </div>
    </div>
  )
}
