import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { supabase } from '../supabase';

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({rating: "", message: "", college: ""});
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  async function submitFeedback() {
    if (!feedback.rating) return;
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
      );
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSent(false);
        setFeedback({rating: "", message: "", college: ""});
      }, 2000);
    } catch (err) {
      console.error("EmailJS error:", err);
      alert("Failed to send feedback. Please try again.");
    }
  }

  return (
    <>
      <nav className="border-b border-slate-700 px-8 py-4 flex items-center justify-between bg-slate-900">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="ScreenIQ Logo" className="w-8 h-8 object-contain" />
          <span className="text-white font-bold text-lg">ScreenIQ</span>
          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Beta</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-slate-400 text-sm hidden sm:inline">{user.email}</span>
              <button
                onClick={() => setShowFeedback(true)}
                className="border border-slate-600 hover:border-slate-400 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors hidden sm:block"
              >
                Give Feedback
              </button>
              <Link
                to="/history"
                className="border border-slate-600 hover:border-blue-500 hover:text-blue-400 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                📋 My History
              </Link>
              <Link
                to="/tool"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Screen Resumes
              </Link>
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
                className="border border-slate-600 hover:border-slate-400 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors hidden sm:block"
              >
                Give Feedback
              </button>
              <Link
                to="/login"
                className="border border-slate-600 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/tool"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Try it free
              </Link>
            </>
          )}
        </div>
      </nav>

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
    </>
  );
}
