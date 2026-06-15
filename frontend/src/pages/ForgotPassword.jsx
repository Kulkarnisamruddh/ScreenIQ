import { useState } from "react"
import { supabase } from "../supabase"
import { Link } from "react-router-dom"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function handleResetPassword(e) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      setMessage("Check your email for the password reset link.")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
        
        <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-slate-400 text-sm mb-6">
          Enter your email address and we will send you a link to reset your password.
        </p>

        <form onSubmit={handleResetPassword}>
          <div className="mb-6">
            <label className="block text-sm text-slate-300 mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500"
              placeholder="you@college.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {message && <p className="text-green-400 text-sm mb-4">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors mb-4"
          >
            {loading ? "Please wait..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm">
          Remember your password?
          <Link to="/login" className="text-blue-400 hover:text-blue-300 ml-1">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
