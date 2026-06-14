import { useState } from "react"
import { supabase } from "../supabase"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Link } from "react-router-dom"

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"]

function AnalyticsPanel({ results }) {
  const buckets = [
    { label: "90+",   count: results.filter(r => r.score >= 90).length },
    { label: "80–89", count: results.filter(r => r.score >= 80 && r.score < 90).length },
    { label: "70–79", count: results.filter(r => r.score >= 70 && r.score < 80).length },
    { label: "60–69", count: results.filter(r => r.score >= 60 && r.score < 70).length },
    { label: "<60",   count: results.filter(r => r.score < 60).length },
  ]

  const roleCounts = {}
  results.forEach(r => {
    const role = r.detected_role || "Unknown"
    roleCounts[role] = (roleCounts[role] || 0) + 1
  })
  const roleData = Object.entries(roleCounts).map(([name, value]) => ({ name, value }))

  return (
    <div className="mt-10 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Score Distribution */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Score Distribution</h3>
        <p className="text-slate-500 text-xs mb-4">Candidates grouped by score range</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={buckets} barSize={36}>
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
              cursor={{ fill: "rgba(99,102,241,0.1)" }}
            />
            <Bar dataKey="count" name="Candidates" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Role Distribution */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Role Distribution</h3>
        <p className="text-slate-500 text-xs mb-4">Breakdown of detected candidate roles</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={roleData}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {roleData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ScreeningTool({ user }) {
  const [files, setFiles] = useState([])
  const [jd, setJd] = useState("")
  const [method, setMethod] = useState("llm")
  const [results, setResults] = useState([])
  const [selectedCompare, setSelectedCompare] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")
  const [guestScreenings, setGuestScreenings] = useState(0)

  const handleSelectCompare = (candidate) => {
    setSelectedCompare(prev => {
      const exists = prev.some(c => c.filename === candidate.filename);
      if (exists) {
        return prev.filter(c => c.filename !== candidate.filename);
      } else {
        if (prev.length >= 4) {
          alert("You can compare a maximum of 4 candidates at once.");
          return prev;
        }
        return [...prev, candidate];
      }
    });
  }

  async function screenResumes() {
    if (files.length === 0) { setError("Please upload at least one PDF"); return; }
    setError("")
    setLoading(true)
    setResults([])
    setSelectedCompare([])

    const formData = new FormData()
    for (let f of files) formData.append("files", f)
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
      let url = baseUrl + "/api/auto-sort"
      if (jd) {
        formData.append("job_description", jd)
        formData.append("method", method)
        url = baseUrl + "/api/rank"
      }

      const res = await fetch(url, {
        method: "POST",
        body: formData
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || "Error from server")
      }
      
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
      setError("Something went wrong. Is the backend running? " + err.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadCSV() {
    const headers = [
      "Rank", "Candidate Name", "Score", "Detected Role", "Experience Level", 
      "CGPA", "Branch", "Batch Year", "Location", "Skills", "Missing Skills",
      "Summary", "Strengths", "Weaknesses", "Red Flags"
    ]
    
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return ""
      if (Array.isArray(val)) {
        val = val.join("; ")
      }
      const str = String(val)
      return `"${str.replace(/"/g, '""')}"`
    }

    const rows = results.map(r => [
      r.rank,
      r.filename.replace(".pdf", ""),
      r.score,
      r.detected_role || "N/A",
      r.experience_level || "N/A",
      r.cgpa !== null ? r.cgpa : "N/A",
      r.branch || "N/A",
      r.batch_year || "N/A",
      r.location || "N/A",
      r.skills_detected || [],
      r.missing_skills || [],
      r.summary,
      r.strengths || [],
      r.weaknesses || [],
      r.red_flags || []
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(","))
      .join("\n")
      
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ranked_resumes.csv"
    a.click()
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

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
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
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm"
          >
            Sign up free
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Job Description
          </label>
          <textarea
            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 h-32 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-4"
            placeholder="Paste the job description here..."
            value={jd}
            onChange={e => setJd(e.target.value)}
          />
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Screening Method
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMethod('llm')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                method === 'llm' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ✨ AI Analysis
            </button>
            <button
              onClick={() => setMethod('tfidf')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                method === 'tfidf' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🧮 TF-IDF (Math)
            </button>
          </div>
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
            <div className="mt-3 max-h-24 overflow-y-auto">
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
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium inline-block"
          >
            Sign up free — it's quick!
          </Link>
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
        const roles = [
          "All", "Web Developer", "ML/AI Engineer", "Java Developer", "Python Developer", 
          "Data Analyst", "DevOps Engineer", "Mobile Developer", "UI/UX Designer", 
          "Product Manager", "QA Tester", "Cloud Architect", "Business Analyst", 
          "HR/Recruiter", "Cyber Security", "Other"
        ]
        const filteredResults = roleFilter === "All" ? results : results.filter(r => r.detected_role === roleFilter)
        
        return (
        <div className="mt-10">
          <AnalyticsPanel results={results} />
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 text-sm font-medium px-6 py-4 w-16">Compare</th>
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
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-blue-650 focus:ring-blue-500 border-slate-600 bg-slate-900 cursor-pointer"
                          checked={selectedCompare.some(c => c.filename === r.filename)}
                          onChange={() => handleSelectCompare(r)}
                        />
                      </td>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-green-400 text-xs font-semibold mb-2">Strengths</p>
                  {r.strengths?.map((s, j) => (
                    <p key={j} className="text-slate-300 text-xs mb-1">• {s}</p>
                  ))}
                </div>
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-amber-400 text-xs font-semibold mb-2">Weaknesses</p>
                  {r.weaknesses?.map((s, j) => (
                    <p key={j} className="text-slate-300 text-xs mb-1">• {s}</p>
                  ))}
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-rose-900/30">
                  <p className="text-rose-400 text-xs font-semibold mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Missing Skills
                  </p>
                  {r.missing_skills && r.missing_skills.length > 0
                    ? r.missing_skills.map((s, j) => <p key={j} className="text-slate-300 text-xs mb-1">• {s}</p>)
                    : <p className="text-emerald-400 text-xs">No missing skills detected</p>
                  }
                </div>
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-red-400 text-xs font-semibold mb-2">Red Flags</p>
                  {r.red_flags && r.red_flags.length > 0
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
      
      {/* Compare Modal logic (simplified) */}
      {showCompareModal && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           {/* ... existing compare modal content logic ... */}
           <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Compare Candidates</h3>
                <button onClick={() => setShowCompareModal(false)} className="text-white">✕</button>
             </div>
             {/* Simple list for brevity */}
             <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompare.length}, minmax(0, 1fr))` }}>
                {selectedCompare.map((c, i) => (
                  <div key={i} className="bg-slate-800 p-4 rounded-xl">
                    <h4 className="text-white font-bold">{c.filename.replace(".pdf", "")}</h4>
                    <p className="text-blue-400 text-sm mb-2">{c.score}/100 Match</p>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p><strong>Missing Skills:</strong> {c.missing_skills?.join(", ") || "None"}</p>
                    </div>
                  </div>
                ))}
             </div>
           </div>
         </div>
      )}

      {/* Floating Compare Bar */}
      {selectedCompare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur border border-blue-500/40 shadow-2xl shadow-blue-500/20 px-6 py-4 rounded-2xl flex items-center gap-6 z-40">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-white text-sm font-medium">
              {selectedCompare.length} {selectedCompare.length === 1 ? 'Candidate' : 'Candidates'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompareModal(true)}
              disabled={selectedCompare.length < 2}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Compare Side-by-Side
            </button>
            <button
              onClick={() => setSelectedCompare([])}
              className="text-slate-400 hover:text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
