import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Auth from "./Auth"
import emailjs from "@emailjs/browser"

export default function App() {
  const [files, setFiles] = useState([])
  const [jd, setJd] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showTool, setShowTool] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState({rating: "", message: "", college: ""})
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [user, setUser] = useState(null)
  const [roleFilter, setRoleFilter] = useState("All")
  const [guestScreenings, setGuestScreenings] = useState(0)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setResults([])
    setShowTool(false)
  }

  async function screenResumes() {
  if (files.length === 0) { setError("Please upload at least one PDF"); return; }
  setError("")
  setLoading(true)
  setResults([])

  const formData = new FormData()
  for (let f of files) formData.append("files", f)
  
  try {
    let url = import.meta.env.VITE_API_BASE_URL + "/api/auto-sort"
    if (jd) {
      formData.append("job_description", jd)
      url = import.meta.env.VITE_API_BASE_URL + "/api/rank"
    }

    const res = await fetch(url, {
      method: "POST",
      body: formData
    })
    const data = await res.json()
    const sortedData = data.sort((a, b) => b.score - a.score)
    const rankedData = sortedData.map((item, index) => ({...item, rank: item.rank || index + 1}))
    setResults(rankedData)

    if (!user) {
      setGuestScreenings(prev => prev + 1)
    } else {
      // Save to database
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          job_title: jd.substring(0, 50),
          job_description: jd,
          total_resumes: data.length
        })
        .select()
        .single()

      if (!sessionError && session) {
        const resumeRows = data.map(r => ({
          session_id: session.id,
          filename: r.filename,
          rank: r.rank,
          score: r.score,
          summary: r.summary,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          red_flags: r.red_flags,
          detected_role: r.detected_role,
          experience_level: r.experience_level,
          cgpa: r.cgpa,
          batch_year: r.batch_year,
          branch: r.branch,
          location: r.location,
          skills_detected: r.skills_detected
        }))

        await supabase.from("resume_results").insert(resumeRows)
      }
    }
  } catch (err) {
    setError("Something went wrong. Is the backend running?")
  } finally {
    setLoading(false)
  }
}

  function downloadCSV() {
    const headers = ["Rank", "Filename", "Score", "Summary", "Strengths", "Weaknesses", "Red Flags"]
    const rows = results.map(r => [
      r.rank, r.filename, r.score, r.summary,
      r.strengths.join(" | "),
      r.weaknesses.join(" | "),
      r.red_flags.join(" | ")
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ranked_resumes.csv"
    a.click()
  }

  async function submitFeedback() {
    if (!feedback.rating) return
    try {
      await emailjs.send(
        "service_qbn0uak",
        "template_dt312nq",
        {
          rating: feedback.rating,
          message: feedback.message || "No message provided",
          college: feedback.college || "Not specified",
          reply_to: "noreply@screeniq.app"
        },
        "uvdjtRqnAXqPdXy5L"
      )
      setFeedbackSent(true)
      setTimeout(() => {
        setShowFeedback(false)
        setFeedbackSent(false)
        setFeedback({rating: "", message: "", college: ""})
      }, 2000)
    } catch (err) {
      console.error("EmailJS error:", err)
      alert("Failed to send feedback. Please try again.")
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400 bg-green-900"
    if (score >= 60) return "text-amber-400 bg-amber-900"
    return "text-red-400 bg-red-900"
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return "bg-yellow-400 text-yellow-900"
    if (rank === 2) return "bg-gray-300 text-gray-800"
    if (rank === 3) return "bg-amber-600 text-white"
    return "bg-blue-100 text-blue-800"
  }

  if (authLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  if (showAuth) return <Auth onLogin={(u) => { setUser(u); setShowAuth(false); }} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">

      {/* Navbar */}
      <nav className="border-b border-slate-700 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span style={{color:"white", fontWeight:"bold", fontSize:"14px"}}>CS</span>
          </div>
          <span className="text-white font-bold text-lg">ScreenIQ</span>
          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Beta</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-slate-400 text-sm">{user.email}</span>
              <button
                onClick={() => setShowFeedback(true)}
                className="border border-slate-600 hover:border-slate-400 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Give Feedback
              </button>
              <button
                onClick={() => setShowTool(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Screen Resumes
              </button>
              <button
                onClick={handleLogout}
                className="border border-red-600 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowFeedback(true)}
                className="border border-slate-600 hover:border-slate-400 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Give Feedback
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="border border-slate-600 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => setShowTool(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Try it free
              </button>
            </>
          )}
        </div>
      </nav>

      {!showTool ? (
        <>
          {/* Hero Section */}
          <div className="text-center px-8 py-20">
            <div className="inline-block bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full mb-6">
               AI Powered — Free to use
            </div>
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Screen 20+ Resumes<br/>
              <span className="text-blue-400">in Seconds</span>
            </h1>
            <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
              Built for placement officers and HR teams. Upload bulk resumes,
              paste a job description, get AI-ranked candidates with full reasoning.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowTool(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-colors"
              >
                Start Screening Free
              </button>
              <button
                onClick={() => document.getElementById('how').scrollIntoView({behavior:'smooth'})}
                className="border border-slate-600 hover:border-slate-400 text-slate-300 px-8 py-4 rounded-2xl font-semibold text-lg transition-colors"
              >
                See How it Works
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="max-w-5xl mx-auto px-8 py-10">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Everything you need to hire faster
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {[
                {icon: "📄", title: "Bulk Upload", desc: "Upload 20 PDF resumes at once. No manual copy-pasting required."},
                {icon: "🤖", title: "AI Ranking", desc: "Every candidate gets a score, strengths, weaknesses and red flags."},
                {icon: "💡", title: "Reasoning Shown", desc: "Unlike other tools, we show WHY a candidate ranked #1 vs #5."},
                {icon: "🚩", title: "Red Flag Detector", desc: "AI automatically flags suspicious gaps, vague titles and inconsistencies."},
                {icon: "📊", title: "CSV Export", desc: "Download ranked results as CSV and share with your team instantly."},
                {icon: "🎓", title: "Built for India", desc: "Designed for college placement cells and Indian SME companies."}
              ].map((f, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How it Works */}
          <div id="how" className="max-w-4xl mx-auto px-8 py-16">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              How it works
            </h2>
            <div className="grid grid-cols-3 gap-8">
              {[
                {step: "01", title: "Upload Resumes", desc: "Select multiple PDF resumes from your computer. Works with any resume format."},
                {step: "02", title: "Paste Job Description", desc: "Copy the job description from any job portal and paste it in the box."},
                {step: "03", title: "Get Ranked Results", desc: "AI ranks all candidates with scores, reasoning and red flags in seconds."}
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">{s.step}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center px-8 py-16">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-12 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to screen smarter?
              </h2>
              <p className="text-slate-400 mb-8">
                Free to use. No signup required. Start screening in 30 seconds.
              </p>
              <button
                onClick={() => setShowTool(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-semibold text-lg transition-colors"
              >
                Start Screening Free
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-slate-700 px-8 py-8">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span style={{color:"white", fontWeight:"bold", fontSize:"10px"}}>CS</span>
                </div>
                <span className="text-white font-bold">ScreenIQ</span>
              </div>
              <div className="flex gap-8 text-slate-400 text-sm">
                <span>Built for placement officers and HR teams</span>
                .
              </div>
              <div className="flex gap-6 text-slate-400 text-sm">
                <a href="mailto:samruddhi.kulkarni72@gmail.com" className="hover:text-white transition-colors">samruddhi.kulkarni72@gmail.com</a>
                <a href="https://www.linkedin.com/in/samruddhi-kulkarni-31a653261" target="_blank" className="hover:text-white transition-colors">LinkedIn</a>
                <a href="https://github.com/Kulkarnisamruddh" target="_blank" className="hover:text-white transition-colors">GitHub</a>
              </div>
            </div>
            <div className="text-center text-slate-600 text-xs mt-6">
              Built with React + FastAPI + Groq AI
            </div>
            <div className="text-center text-slate-500 text-xs mt-2">
              Built by Samruddhi Kulkarni — Chhatrapati Sambhajinagar, India
            </div>
          </footer>
        </>
      ) : (
        <div className="max-w-5xl mx-auto px-8 py-10">
          <button
            onClick={() => { setShowTool(false); setResults([]); }}
            className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors"
          >
            ← Back to home
          </button>

          <h2 className="text-3xl font-bold text-white mb-2">Screen Resumes</h2>
          <p className="text-slate-400 mb-8">Upload PDFs and paste a job description to get started</p>

          {/* Guest Banner */}
          {!user && (
            <div className="bg-blue-900 border border-blue-700 rounded-xl p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-blue-300 text-sm font-medium">
                  Guest mode — {Math.max(0, 3 - guestScreenings)} free screenings remaining
                </p>
                <p className="text-blue-400 text-xs mt-1">
                  Sign up free to unlock 20 resumes + save history
                </p>
              </div>
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm"
              >
                Sign up free
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Job Description
              </label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 h-40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="Paste the job description here..."
                value={jd}
                onChange={e => setJd(e.target.value)}
              />
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Upload Resumes (PDF only)
              </label>
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={e => setFiles(Array.from(e.target.files))}
                  className="hidden"
                  id="fileInput"
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-slate-400 text-sm">Click to upload PDF resumes</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {user ? "Max 20 resumes per screening" : "Max 3 resumes as guest"}
                  </p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="mt-3">
                  <p className="text-green-400 text-sm font-medium">{files.length} file(s) selected</p>
                  {Array.from(files).map((f, i) => (
                    <p key={i} className="text-slate-400 text-xs mt-1">• {f.name}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

          {!user && guestScreenings >= 3 ? (
            <div className="text-center py-8 bg-slate-800 border border-slate-700 rounded-2xl">
              <p className="text-white font-bold text-xl mb-2">You've used all 3 free screenings!</p>
              <p className="text-slate-400 text-sm mb-6">Sign up free to unlock 20 resumes + save history</p>
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium"
              >
                Sign up free — it's quick!
              </button>
            </div>
          ) : (
            <button
              onClick={screenResumes}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-semibold text-lg transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Screening resumes... please wait
                </span>
              ) : "Screen Resumes"}
            </button>
          )}

          {results.length > 0 && (() => {
            const roles = ["All", ...new Set(results.map(r => r.detected_role))]
            const filteredResults = roleFilter === "All" ? results : results.filter(r => r.detected_role === roleFilter)
            
            return (
            <div className="mt-10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-white">{filteredResults.length} Candidates Ranked</h2>
                  <select
                    className="bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={downloadCSV}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Download CSV
                </button>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm font-medium px-6 py-4">Rank</th>
                      <th className="text-left text-slate-400 text-sm font-medium px-6 py-4">Candidate</th>
                      <th className="text-left text-slate-400 text-sm font-medium px-6 py-4">Score</th>
                      <th className="text-left text-slate-400 text-sm font-medium px-6 py-4">Best Fit Role</th>
                      <th className="text-left text-slate-400 text-sm font-medium px-6 py-4">Summary</th>
                      <th className="text-left text-slate-400 text-sm font-medium px-6 py-4">Red Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r, i) => (
                      <tr key={i} className="border-b border-slate-700 hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadge(r.rank)}`}>
                            {r.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white text-sm font-medium">{r.filename.replace(".pdf", "")}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(r.score)}`}>
                            {r.score}/100
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-blue-400 text-xs font-semibold">{r.detected_role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-400 text-xs max-w-xs">{r.summary}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${r.red_flags.length ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"}`}>
                            {r.red_flags.length ? r.red_flags[0] : "None"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-bold text-white mb-4">Detailed Breakdown</h3>
              {filteredResults.map((r, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getRankBadge(r.rank)}`}>
                        #{r.rank}
                      </span>
                      <div>
                        <h4 className="text-white font-semibold">{r.filename.replace(".pdf", "")}</h4>
                        <p className="text-slate-400 text-xs">{r.summary}</p>
                      </div>
                    </div>
                    <span className={`text-2xl font-bold px-4 py-2 rounded-xl ${getScoreColor(r.score)}`}>
                      {r.score}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900 rounded-xl p-4">
                      <p className="text-green-400 text-xs font-semibold mb-2">Strengths</p>
                      {r.strengths.map((s, j) => (
                        <p key={j} className="text-slate-300 text-xs mb-1">• {s}</p>
                      ))}
                    </div>
                    <div className="bg-slate-900 rounded-xl p-4">
                      <p className="text-amber-400 text-xs font-semibold mb-2">Weaknesses</p>
                      {r.weaknesses.map((s, j) => (
                        <p key={j} className="text-slate-300 text-xs mb-1">• {s}</p>
                      ))}
                    </div>
                    <div className="bg-slate-900 rounded-xl p-4">
                      <p className="text-red-400 text-xs font-semibold mb-2">Red Flags</p>
                      {r.red_flags.length
                        ? r.red_flags.map((s, j) => <p key={j} className="text-slate-300 text-xs mb-1">• {s}</p>)
                        : <p className="text-green-400 text-xs">None detected</p>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000}}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4">
            {feedbackSent ? (
              <div className="text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-white font-bold text-xl">Thank you!</h3>
                <p className="text-slate-400 mt-2">Your feedback helps us improve</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold text-xl">Share Feedback</h3>
                  <button onClick={() => setShowFeedback(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
                </div>
                <p className="text-slate-400 text-sm mb-4">How was your experience?</p>
                <div className="flex gap-3 mb-6">
                  {["Excellent", "Good", "Average", "Poor"].map(r => (
                    <button
                      key={r}
                      onClick={() => setFeedback({...feedback, rating: r})}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        feedback.rating === r ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500 h-24 mb-4"
                  placeholder="Tell us what you liked or what we can improve..."
                  value={feedback.message}
                  onChange={e => setFeedback({...feedback, message: e.target.value})}
                />
                <input
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500 mb-6"
                  placeholder="Your college or company name (optional)"
                  value={feedback.college}
                  onChange={e => setFeedback({...feedback, college: e.target.value})}
                />
                <button
                  onClick={submitFeedback}
                  disabled={!feedback.rating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Submit Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}