import React, { useMemo } from 'react'
import type { WorkoutPlan } from '../types'

export default function Plan() {
  const plan: WorkoutPlan | null = useMemo(() => {
    const raw = localStorage.getItem('lastPlan')
    if (!raw) return null
    try {
      return JSON.parse(raw) as WorkoutPlan
    } catch {
      return null
    }
  }, [])

  if (!plan) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Plan</h1>
        <p>No plan found. Please generate one on the Onboarding page.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>{plan.name}</h1>
      {plan.goal_summary && <p>{plan.goal_summary}</p>}
      <p>
        <small>ID: {plan.id}</small>
      </p>
      {plan.days.map(day => (
        <section key={day.day} style={{ marginBottom: 24 }}>
          <h2>Day {day.day}{day.focus ? ` — ${day.focus}` : ''}</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {day.exercises.map((ex, idx) => (
              <li key={idx} style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {ex.image_url ? (
                  <img src={ex.image_url} alt={ex.name} width={96} height={96} style={{ objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 96, height: 96, background: '#eee', borderRadius: 8 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{ex.name}</div>
                  <div>
                    Sets: {ex.sets} • Reps: {ex.reps} • Rest: {ex.rest_seconds}s
                  </div>
                  {ex.explanation && <div style={{ color: '#555' }}>{ex.explanation}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
