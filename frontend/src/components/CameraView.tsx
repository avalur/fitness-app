import React, { useEffect, useMemo, useRef, useState } from 'react'
import useUserMedia, { Resolution } from '../lib/useUserMedia'

interface CameraViewProps {
  autoStart?: boolean
  defaultResolution?: Resolution
}

export default function CameraView({ autoStart = true, defaultResolution = '720p' }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined)
  const [resolution, setResolution] = useState<Resolution>(defaultResolution)
  const { stream, error, isActive, devices, start, stop } = useUserMedia({ resolution, deviceId: selectedDevice, facingMode: 'user' })

  // Attach stream to the <video>
  useEffect(() => {
    const node = videoRef.current
    if (!node) return
    if ('srcObject' in node) {
      // @ts-expect-error - srcObject exists in modern browsers
      node.srcObject = stream
    } else if (stream) {
      node.src = URL.createObjectURL(stream as any)
    }
    return () => {
      if (node && 'srcObject' in node) {
        // @ts-expect-error - cleanup
        node.srcObject = null
      }
    }
  }, [stream])

  // Autostart on mount
  useEffect(() => {
    if (autoStart) start({ deviceId: selectedDevice, resolution, facingMode: 'user' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasMultipleCams = useMemo(() => devices.length > 1, [devices.length])

  const onChangeDevice = async (id: string) => {
    setSelectedDevice(id || undefined)
    await start({ deviceId: id || undefined, resolution, facingMode: 'user' })
  }

  const onChangeResolution = async (res: Resolution) => {
    setResolution(res)
    await start({ deviceId: selectedDevice, resolution: res, facingMode: 'user' })
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => start({ deviceId: selectedDevice, resolution, facingMode: 'user' })} disabled={isActive}>
          Start Camera
        </button>
        <button onClick={stop} disabled={!isActive}>
          Stop Camera
        </button>
        <label>
          Resolution{' '}
          <select value={resolution} onChange={e => onChangeResolution(e.target.value as Resolution)}>
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </label>
        <label>
          Camera{' '}
          <select
            value={selectedDevice || ''}
            onChange={e => onChangeDevice(e.target.value)}
            disabled={devices.length === 0}
          >
            <option value="">Default</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div style={{ color: 'red' }}>
          {error}
        </div>
      )}

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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        {!isActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#aaa',
            }}
          >
            <span>Camera is off</span>
          </div>
        )}
      </div>

      <div style={{ color: '#555', fontSize: 14 }}>
        Tips for macOS:
        <ul>
          <li>Use Safari, Chrome, or Edge on localhost or HTTPS.</li>
          <li>If you denied camera access, enable it in System Settings → Privacy & Security → Camera.</li>
          {hasMultipleCams && <li>Use the Camera dropdown to switch between available devices.</li>}
        </ul>
      </div>
    </div>
  )
}
