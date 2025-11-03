import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserGoal, Level, Goal, WorkoutPlan } from '../types'
import { postJSON } from '../lib/api'

const goals: Goal[] = ['fat_loss', 'muscle_gain', 'endurance', 'general_fitness']
const levels: Level[] = ['beginner', 'intermediate', 'advanced']

export default function Onboarding() {
  const nav = useNavigate()
  const [form, setForm] = useState<UserGoal>({
    goal: 'general_fitness',
    level: 'beginner',
    constraints: '',
    equipment: [],
    days_per_week: 3,
  })
  const [equipmentInput, setEquipmentInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const plan = await postJSON<WorkoutPlan>('/plans/', form)
      localStorage.setItem('lastPlan', JSON.stringify(plan))
      nav('/plan')
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const addEquipment = () => {
    if (!equipmentInput.trim()) return
    setForm(f => ({ ...f, equipment: [...f.equipment, equipmentInput.trim()] }))
    setEquipmentInput('')
  }

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <h1>Onboarding</h1>
      <p>Tell us your goal and constraints. We will generate a personalized plan.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Goal
          <select
            value={form.goal}
            onChange={e => setForm(f => ({ ...f, goal: e.target.value as Goal }))}
          >
            {goals.map(g => (
              <option key={g} value={g}>
                {g.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select
            value={form.level}
            onChange={e => setForm(f => ({ ...f, level: e.target.value as Level }))}
          >
            {levels.map(l => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Constraints (optional)
          <input
            type="text"
            value={form.constraints || ''}
            onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))}
          />
        </label>
        <label>
          Equipment (optional)
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={equipmentInput}
              onChange={e => setEquipmentInput(e.target.value)}
            />
            <button type="button" onClick={addEquipment}>
              Add
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {form.equipment.map((eq, i) => (
              <span key={i} style={{ border: '1px solid #ccc', padding: '2px 6px' }}>
                {eq}
              </span>
            ))}
          </div>
        </label>
        <label>
          Days per week
          <input
            type="number"
            min={1}
            max={7}
            value={form.days_per_week}
            onChange={e => setForm(f => ({ ...f, days_per_week: Number(e.target.value) }))}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Generating…' : 'Generate Plan'}
        </button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>
    </div>
  )
}
