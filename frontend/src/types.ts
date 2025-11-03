export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Goal = 'fat_loss' | 'muscle_gain' | 'endurance' | 'general_fitness'

export interface UserGoal {
  goal: Goal
  level: Level
  constraints?: string
  equipment: string[]
  days_per_week: number
}

export interface PlanExercise {
  name: string
  sets: number
  reps: string
  rest_seconds: number
  image_url?: string
  explanation?: string
}

export interface PlanDay {
  day: number
  focus?: string
  exercises: PlanExercise[]
}

export interface WorkoutPlan {
  id: string
  name: string
  goal_summary?: string
  created_at: string
  days: PlanDay[]
}
