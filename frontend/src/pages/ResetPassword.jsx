import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        // Recovery hash successfully parsed, can proceed to update password
      }
    })
  }, [])

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      if (error) throw error
      setMessage("Password updated successfully!")
      setTimeout(() => {
        navigate('/tool')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
        
        <h2 className="text-2xl font-bold text-white mb-2">Update Password</h2>
        <p className="text-slate-400 text-sm mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleUpdatePassword}>
          <div className="mb-6">
            <label className="block text-sm text-slate-300 mb-2">New Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {message && <p className="text-green-400 text-sm mb-4">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors mb-4"
          >
            {loading ? "Please wait..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  )
}
