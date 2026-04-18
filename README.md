<div align="center">
  <img src="frontend/public/logo.png" alt="ScreenIQ Logo" width="120" />
  <h1>ScreenIQ 🎓</h1>
  <p><b>AI-powered bulk resume screener built for college placement officers and HR teams.</b></p>
  <br />
  <a href="https://screen-iq.vercel.app/"><strong>View Live Demo »</strong></a>
</div>

<br />

## 🚀 What it does

ScreenIQ is an intelligent tool designed to make hiring and placement faster. Instead of reading hundreds of resumes manually, ScreenIQ uses advanced AI to evaluate them instantly.

- **Bulk Upload**: Upload up to 20 PDF resumes at once.
- **Smart Ranking**: Paste a job description to get candidates ranked by their fit.
- **Auto-Sort**: Don't have a job description? Just upload resumes, and the AI will automatically categorize them into roles (e.g., Python Developer, UI/UX Designer).
- **Deep Insights**: Every candidate receives a score out of 100, a summary, key strengths, weaknesses, and **red flags** (like suspicious employment gaps).
- **Export**: Export your fully ranked results as a CSV for your team.

## 💻 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python + FastAPI (Asynchronous)
- **AI Integration**: Groq API (LLaMA 3.3 70B Model)
- **PDF Parsing**: pdfplumber
- **Database**: Supabase
- **Hosting**: Vercel (Frontend) & Railway (Backend)

## 🛠️ Local Setup

Want to run ScreenIQ locally on your machine?

### 1. Clone the repository
```bash
git clone https://github.com/Kulkarnisamruddh/ScreenIQ.git
cd ScreenIQ
```

### 2. Start the Backend
```bash
cd backend
python -m venv venv
# On Windows use: venv\Scripts\activate
# On Mac/Linux use: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Start the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

## 👨‍💻 Built By
**Samruddhi Kulkarni** — Chhatrapati Sambhajinagar, India  
[LinkedIn](https://www.linkedin.com/in/samruddhi-kulkarni-31a653261) | [Email](mailto:samruddhi.kulkarni72@gmail.com)
