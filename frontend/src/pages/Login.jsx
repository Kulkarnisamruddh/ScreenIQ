import { useState } from "react"
import { supabase } from "../supabase"
import { Link, useNavigate } from "react-router-dom"

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organization: "",
    role: "placement_officer"
  })
  const navigate = useNavigate()

  async function handleSubmit() {
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        })
        if (error) throw error
        onLogin(data.user)
        navigate('/tool')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              organization: form.organization,
              role: form.role
            }
          }
        })
        if (error) throw error
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            name: form.name,
            email: form.email,
            organization: form.organization,
            role: form.role
          })
          onLogin(data.user)
          navigate('/tool')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {isLogin ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          {isLogin ? "Sign in to access your screenings" : "Start screening resumes for free"}
        </p>

        {!isLogin && (
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-2">Full Name</label>
            <input
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500"
              placeholder="Samruddhi Kulkarni"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-2">Email</label>
          <input
            type="email"
            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500"
            placeholder="you@college.edu"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
        </div>

        <div className="mb-4 relative">
          <label className="block text-sm text-slate-300 mb-2">Password</label>
          <input
            type="password"
            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
          {isLogin && (
            <div className="flex justify-end mt-2">
              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-xs">
                Forgot Password?
              </Link>
            </div>
          )}
        </div>

        {!isLogin && (
          <>
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">College / Company</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500"
                placeholder="MIT College of Engineering"
                value={form.organization}
                onChange={e => setForm({...form, organization: e.target.value})}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-slate-300 mb-2">I am a</label>
              <div className="flex gap-3">
                {[
                  {value: "placement_officer", label: "Placement Officer"},
                  {value: "hr", label: "HR / Recruiter"},
                  {value: "other", label: "Other"}
                ].map(r => (
                  <button
                    key={r.value}
                    onClick={() => setForm({...form, role: r.value})}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                      form.role === r.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors mb-4"
        >
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </button>

        <p className="text-center text-slate-400 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => { setIsLogin(!isLogin); setError("") }}
            className="text-blue-400 hover:text-blue-300 ml-1"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

      </div>
    </div>
  )
}
