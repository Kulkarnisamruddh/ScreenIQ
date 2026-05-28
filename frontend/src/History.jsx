import { useState, useEffect } from "react"
import { supabase } from "./supabase"

export default function History({ user, onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState(null)
  const [sessionResults, setSessionResults] = useState({})
  const [loadingResults, setLoadingResults] = useState(null)
  const [selectedCompare, setSelectedCompare] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)

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

  function downloadCSVForSession(results, jobTitle) {
    const headers = [
      "Rank", "Candidate Name", "Score", "Detected Role", "Experience Level", 
      "CGPA", "Branch", "Batch Year", "Location", "Skills", 
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
      r.filename?.replace(".pdf", "") || "",
      r.score,
      r.detected_role || "N/A",
      r.experience_level || "N/A",
      r.cgpa !== null ? r.cgpa : "N/A",
      r.branch || "N/A",
      r.batch_year || "N/A",
      r.location || "N/A",
      r.skills_detected || [],
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
    a.download = `ranked_resumes_${jobTitle?.substring(0, 30).replace(/\s+/g, '_') || "session"}.csv`
    a.click()
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    setLoading(true)
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (!error) setSessions(data || [])
    setLoading(false)
  }

  async function fetchResults(sessionId) {
    setSelectedCompare([]) // Clear selection when switching sessions
    if (sessionResults[sessionId]) {
      setExpandedSession(expandedSession === sessionId ? null : sessionId)
      return
    }
    setLoadingResults(sessionId)
    const { data, error } = await supabase
      .from("resume_results")
      .select("*")
      .eq("session_id", sessionId)
      .order("rank", { ascending: true })

    if (!error) {
      setSessionResults(prev => ({ ...prev, [sessionId]: data || [] }))
    }
    setLoadingResults(null)
    setExpandedSession(sessionId)
  }

  function formatDate(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
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
      {/* Header */}
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors"
      >
        ← Back to home
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">My Screenings</h2>
          <p className="text-slate-400 mt-1">All your past resume screening sessions</p>
        </div>
        <span className="ml-auto bg-blue-900 text-blue-300 text-sm px-4 py-1.5 rounded-full font-medium">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-slate-400">Loading your history...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 bg-slate-800 border border-slate-700 rounded-2xl">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-white font-bold text-xl mb-2">No screenings yet</h3>
          <p className="text-slate-400 text-sm">Run your first resume screening to see history here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden transition-all"
            >
              {/* Session card header */}
              <div className="px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-300 text-xl">📄</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {session.job_title
                        ? session.job_title.length > 60
                          ? session.job_title.substring(0, 60) + "..."
                          : session.job_title
                        : "General Screening (No JD)"}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-slate-500 text-xs">
                        🕒 {formatDate(session.created_at)}
                      </span>
                      <span className="text-slate-500 text-xs">
                        👥 {session.total_resumes} resume{session.total_resumes !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => fetchResults(session.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {loadingResults === session.id ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Loading...
                    </>
                  ) : expandedSession === session.id ? (
                    "▲ Hide Results"
                  ) : (
                    "▼ View Results"
                  )}
                </button>
              </div>

              {/* Expanded results table */}
              {expandedSession === session.id && sessionResults[session.id] && (
                <div className="border-t border-slate-700 px-6 pb-6 pt-4">
                  {sessionResults[session.id].length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No results found for this session.</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-white font-semibold text-sm">Session Rankings</h4>
                        <button
                          onClick={() => downloadCSVForSession(sessionResults[session.id], session.job_title)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Download CSV
                        </button>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-700">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-700">
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs w-12">Compare</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Rank</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Candidate</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Score</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Role</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Summary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionResults[session.id].map((r, i) => (
                            <tr
                              key={i}
                              className="border-b border-slate-700 last:border-0 hover:bg-slate-700 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded text-blue-650 focus:ring-blue-500 border-slate-600 bg-slate-900 cursor-pointer"
                                  checked={selectedCompare.some(c => c.filename === r.filename)}
                                  onChange={() => handleSelectCompare(r)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadge(r.rank)}`}>
                                  {r.rank}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-white font-medium">{r.filename?.replace(".pdf", "")}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(r.score)}`}>
                                  {r.score}/100
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-blue-400 text-xs">{r.detected_role || "—"}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-slate-400 text-xs max-w-xs truncate">{r.summary}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          ))}
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
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
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

      {/* Candidate Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  ⚖️ Candidate Comparison Matrix
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  Side-by-side comparative analysis of selected profiles
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Matrix Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              {/* Profile Card Grid */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompare.length}, minmax(0, 1fr))` }}>
                {selectedCompare.map((c, idx) => (
                  <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      {/* Rank Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadge(c.rank)}`}>
                          #{c.rank}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(c.score)}`}>
                          {c.score}/100 Match
                        </span>
                      </div>
                      <h4 className="text-white font-bold text-base leading-tight mb-1 truncate" title={c.filename}>
                        {c.filename?.replace(".pdf", "")}
                      </h4>
                      <p className="text-blue-400 text-xs font-semibold mb-3">{c.detected_role}</p>
                    </div>
                    
                    <div className="space-y-1.5 border-t border-slate-700/50 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exp Level:</span>
                        <span className="text-slate-300 font-medium">{c.experience_level || "Fresher"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CGPA:</span>
                        <span className="text-slate-300 font-medium">{c.cgpa !== null ? c.cgpa : "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Branch:</span>
                        <span className="text-slate-300 font-medium">{c.branch || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Batch:</span>
                        <span className="text-slate-300 font-medium">{c.batch_year || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Location:</span>
                        <span className="text-slate-300 font-medium">{c.location || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Skill Overlap Matrix */}
              <div className="bg-slate-800/25 border border-slate-700/80 rounded-2xl p-6">
                <h4 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
                  🛠️ Skills Coverage Comparison
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/60 pb-2">
                        <th className="py-2 text-slate-400 font-medium">Skill</th>
                        {selectedCompare.map((c, i) => (
                          <th key={i} className="py-2 px-4 text-slate-300 font-semibold truncate max-w-[150px]">
                            {c.filename?.replace(".pdf", "")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allSkills = Array.from(new Set(
                          selectedCompare.flatMap(c => c.skills_detected || [])
                        )).sort();

                        if (allSkills.length === 0) {
                          return (
                            <tr>
                              <td colSpan={selectedCompare.length + 1} className="py-4 text-center text-slate-500">
                                No specific skills extracted.
                              </td>
                            </tr>
                          )
                        }

                        return allSkills.map((skill, sIdx) => (
                          <tr key={sIdx} className="border-b border-slate-800/40 hover:bg-slate-800/10">
                            <td className="py-2.5 font-medium text-slate-300 capitalize">{skill}</td>
                            {selectedCompare.map((c, cIdx) => {
                              const hasSkill = c.skills_detected?.some(s => s.toLowerCase() === skill.toLowerCase());
                              return (
                                <td key={cIdx} className="py-2.5 px-4">
                                  {hasSkill ? (
                                    <span className="text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] font-semibold">
                                      ✓ Yes
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 font-semibold">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Strengths, Weaknesses, and Red Flags Side-by-Side */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                    📝 Candidate Summary
                  </h4>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompare.length}, minmax(0, 1fr))` }}>
                    {selectedCompare.map((c, i) => (
                      <div key={i} className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-4">
                        <p className="text-slate-300 text-xs leading-relaxed italic">"{c.summary}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-emerald-400 font-semibold text-base mb-3 flex items-center gap-2">
                    💪 Key Strengths
                  </h4>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompare.length}, minmax(0, 1fr))` }}>
                    {selectedCompare.map((c, i) => (
                      <div key={i} className="bg-emerald-950/5 border border-emerald-900/15 rounded-xl p-4 space-y-1.5">
                        {c.strengths?.map((str, sIdx) => (
                          <p key={sIdx} className="text-slate-300 text-xs flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{str}</span>
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-amber-400 font-semibold text-base mb-3 flex items-center gap-2">
                    ⚠️ Weaknesses / Gaps
                  </h4>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompare.length}, minmax(0, 1fr))` }}>
                    {selectedCompare.map((c, i) => (
                      <div key={i} className="bg-amber-950/5 border border-amber-900/15 rounded-xl p-4 space-y-1.5">
                        {c.weaknesses?.map((wk, wIdx) => (
                          <p key={wIdx} className="text-slate-300 text-xs flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{wk}</span>
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-rose-400 font-semibold text-base mb-3 flex items-center gap-2">
                    🚩 Red Flags Detected
                  </h4>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompare.length}, minmax(0, 1fr))` }}>
                    {selectedCompare.map((c, i) => {
                      const hasRedFlags = c.red_flags && c.red_flags.length > 0;
                      return (
                        <div key={i} className={`rounded-xl p-4 border ${hasRedFlags ? 'bg-rose-950/5 border-rose-900/20' : 'bg-slate-800 border-slate-700/20'}`}>
                          {hasRedFlags ? (
                            <div className="space-y-1.5">
                              {c.red_flags.map((rf, rIdx) => (
                                <p key={rIdx} className="text-rose-300 text-xs flex items-start gap-1.5 font-medium">
                                  <span>⚠️</span>
                                  <span>{rf}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                              <span>✓</span> Clean profile (No flags)
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
