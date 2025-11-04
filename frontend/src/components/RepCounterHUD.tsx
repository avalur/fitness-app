import React from 'react'

interface HUDProps {
  reps: number
  phase: 'idle' | 'down' | 'up'
  tips: string[]
}

export default function RepCounterHUD({ reps, phase, tips }: HUDProps) {
  const phaseColor = phase === 'up' ? '#2ecc71' : phase === 'down' ? '#e67e22' : '#95a5a6'
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div
          aria-live="polite"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            padding: '8px 14px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 24,
          }}
        >
          Reps: {reps}
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <div
          role="progressbar"
          aria-label="Technique quality"
          style={{
            height: 10,
            background: '#333',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div style={{ width: '100%', height: '100%', background: phaseColor, opacity: 0.8 }} />
        </div>
        <div
          aria-live="polite"
          style={{
            background: 'rgba(0,0,0,0.45)',
            color: 'white',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 14,
            maxWidth: 520,
          }}
        >
          {tips.length > 0 ? tips.join(' • ') : 'Getting ready...'}
        </div>
      </div>
    </div>
  )
}
