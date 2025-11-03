import React from 'react'
import CameraView from '../components/CameraView'

export default function Live() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Live Session</h1>
      <p style={{ marginTop: 4, marginBottom: 16 }}>
        Camera preview is available below. LLM-based pose estimation will be added later.
      </p>
      <CameraView />
    </div>
  )
}
