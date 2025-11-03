import { useCallback, useEffect, useRef, useState } from 'react'

export type Resolution = '720p' | '480p' | '1080p'

const RESOLUTION_MAP: Record<Resolution, { width: number; height: number }> = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
}

export interface UseUserMediaOptions {
  deviceId?: string
  resolution?: Resolution
  facingMode?: 'user' | 'environment'
}

export interface UseUserMedia {
  stream: MediaStream | null
  error: string | null
  isActive: boolean
  devices: MediaDeviceInfo[]
  start: (opts?: UseUserMediaOptions) => Promise<void>
  stop: () => void
  refreshDevices: () => Promise<void>
}

function getConstraints(opts?: UseUserMediaOptions): MediaStreamConstraints {
  const { deviceId, resolution = '720p', facingMode = 'user' } = opts || {}
  const res = RESOLUTION_MAP[resolution]
  const video: MediaTrackConstraints = {
    width: { ideal: res.width },
    height: { ideal: res.height },
    facingMode,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  }
  return { video, audio: false }
}

export function useUserMedia(initial?: UseUserMediaOptions): UseUserMedia {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [isActive, setIsActive] = useState(false)
  const currentTracksRef = useRef<MediaStreamTrack[] | null>(null)

  const stop = useCallback(() => {
    currentTracksRef.current?.forEach(t => t.stop())
    currentTracksRef.current = null
    setStream(null)
    setIsActive(false)
  }, [])

  const start = useCallback(async (opts?: UseUserMediaOptions) => {
    setError(null)
    try {
      // Ensure any previous stream is stopped
      stop()
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported in this browser.')
      }
      const constraints = getConstraints(opts ?? initial)
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      currentTracksRef.current = s.getTracks()
      setStream(s)
      setIsActive(true)
      // After permission granted, refresh devices to reveal labels
      await refreshDevices()
    } catch (e: any) {
      let msg = e?.message || String(e)
      if (e?.name === 'NotAllowedError') {
        msg = 'Camera permission denied. Please allow access in the browser and macOS System Settings > Privacy & Security > Camera.'
      } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
        msg = 'Requested camera not found. Try a different device or resolution.'
      }
      setError(msg)
      setIsActive(false)
    }
  }, [initial, stop])

  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.filter(d => d.kind === 'videoinput'))
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    // Preload device list (labels will be empty until perm granted)
    refreshDevices()
    return () => stop()
  }, [refreshDevices, stop])

  return { stream, error, isActive, devices, start, stop, refreshDevices }
}

export default useUserMedia
