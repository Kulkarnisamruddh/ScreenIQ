import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import ScreeningTool from "./pages/ScreeningTool"
import History from "./History"

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  if (authLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  return (
    <HashRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/tool" element={<ScreeningTool user={user} />} />
            <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/tool" />} />
            <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/tool" />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/history" element={user ? <History user={user} onBack={() => window.history.back()} /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  )
}