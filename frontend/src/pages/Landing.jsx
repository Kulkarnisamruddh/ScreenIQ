import { Link } from 'react-router-dom';

export default function Landing() {
  return (
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
          <Link
            to="/tool"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-colors"
          >
            Start Screening Free
          </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <Link
            to="/tool"
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-semibold text-lg transition-colors inline-block"
          >
            Start Screening Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ScreenIQ Logo" className="w-6 h-6 object-contain" />
            <span className="text-white font-bold">ScreenIQ</span>
          </div>
          <div className="flex gap-8 text-slate-400 text-sm text-center">
            <span>Built for placement officers and HR teams</span>
          </div>
          <div className="flex gap-6 text-slate-400 text-sm">
            <a href="mailto:samruddhi.kulkarni72@gmail.com" className="hover:text-white transition-colors">samruddhi.kulkarni72@gmail.com</a>
            <a href="https://www.linkedin.com/in/samruddhi-kulkarni-31a653261" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="https://github.com/Kulkarnisamruddh" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
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
  );
}
