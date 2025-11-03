import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Plan from './pages/Plan'
import Live from './pages/Live'
import History from './pages/History'

function Nav() {
  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12 }}>
      <Link to="/onboarding">Onboarding</Link>
      <Link to="/plan">Plan</Link>
      <Link to="/live">Live</Link>
      <Link to="/history">History</Link>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/live" element={<Live />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
