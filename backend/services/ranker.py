from groq import AsyncGroq
import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

def extract_json_array(text: str) -> str:
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1:
        return text[start:end+1]
    return text

def rank_resumes_tfidf(job_description: str, resumes: list) -> list:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    texts = [job_description] + [r['text'] for r in resumes]
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(texts)
    
    # Cosine similarity of JD (index 0) with all resumes
    cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    
    results = []
    for i, score in enumerate(cosine_similarities):
        results.append({
            "filename": resumes[i]['filename'],
            "rank": 0, # Will sort and update
            "score": int(score * 100),
            "strengths": ["Matched relevant keywords based on TF-IDF scoring"],
            "weaknesses": ["TF-IDF cannot analyze contextual weaknesses"],
            "red_flags": [],
            "summary": f"Ranked mathematically with Cosine Similarity score of {int(score*100)}/100.",
            "detected_role": "Unknown",
            "experience_level": "Unknown",
            "cgpa": None,
            "batch_year": None,
            "branch": None,
            "location": None,
            "skills_detected": [],
            "missing_skills": []
        })
        
    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    for idx, r in enumerate(results):
        r['rank'] = idx + 1
        
    return results

async def rank_resumes(job_description: str, resumes: list) -> list:
    resume_text = ""
    for i, resume in enumerate(resumes):
        resume_text += f"\n\nResume {i+1} - {resume['filename']}:\n{resume['text']}"

    prompt = f"""You are a senior recruiter. Analyze these resumes for the following job description and rank them.

Job Description:
{job_description}

Resumes:
{resume_text}

For each resume extract and provide:
1. Rank (1 being best)
2. Score out of 100
3. Top 3 strengths
4. Top 3 weaknesses
5. Red flags (if any)
6. One line summary
7. Detected role (exactly one of: Web Developer, ML/AI Engineer, Java Developer, Python Developer, Data Analyst, DevOps Engineer, Mobile Developer, UI/UX Designer, Product Manager, QA Tester, Cloud Architect, Business Analyst, HR/Recruiter, Cyber Security, Other)
8. Experience level (exactly one of: Fresher, 1-2 years, 3-5 years, 5+ years)
9. CGPA (extract exact number from resume, null if not found)
10. Batch year (graduation year as number, null if not found)
11. Branch (e.g. CS, IT, ENTC, Mechanical, null if not found)
12. Location (city name if mentioned, null if not found)
13. Top 5 skills detected (as list)
14. Missing skills (skills mentioned in JD but missing in this resume, as list)

Respond in this exact JSON format:
[
  {{
    "filename": "resume filename here",
    "rank": 1,
    "score": 85,
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "red_flags": ["red flag if any"],
    "summary": "one line summary",
    "detected_role": "Python Developer",
    "experience_level": "Fresher",
    "cgpa": 7.46,
    "batch_year": 2026,
    "branch": "CS",
    "location": "Pune",
    "skills_detected": ["Python", "Machine Learning", "Flask", "OpenCV", "SQL"],
    "missing_skills": ["Docker", "AWS"]
  }}
]

Return only JSON, nothing else."""

    await asyncio.sleep(3)

    chat_completion = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
    )

    clean = chat_completion.choices[0].message.content
    clean = clean.replace("```json", "").replace("```", "").strip()
    try:
        clean = extract_json_array(clean)
        result = json.loads(clean)
    except json.JSONDecodeError:
        result = json.loads(clean)
    return result


async def auto_sort_resumes(resumes: list) -> list:
    resume_text = ""
    for i, resume in enumerate(resumes):
        resume_text += f"\n\nResume {i+1} - {resume['filename']}:\n{resume['text']}"

    prompt = f"""You are a senior recruiter. Analyze these resumes and automatically sort them by role.

Resumes:
{resume_text}

For each resume extract and provide:
1. Score out of 100
2. Top 3 strengths
3. Top 3 weaknesses
4. Red flags (if any)
5. One line summary
6. Detected role (exactly one of: Web Developer, ML/AI Engineer, Java Developer, Python Developer, Data Analyst, DevOps Engineer, Mobile Developer, UI/UX Designer, Product Manager, QA Tester, Cloud Architect, Business Analyst, HR/Recruiter, Cyber Security, Other)
7. Experience level (exactly one of: Fresher, 1-2 years, 3-5 years, 5+ years)
8. CGPA (extract exact number, null if not found)
9. Batch year (graduation year, null if not found)
10. Branch (CS/IT/ENTC/Mechanical etc, null if not found)
11. Location (city if mentioned, null if not found)
12. Top 5 skills detected

Respond in this exact JSON format:
[
  {{
    "filename": "resume filename here",
    "score": 85,
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "red_flags": ["red flag if any"],
    "summary": "one line summary",
    "detected_role": "Python Developer",
    "experience_level": "Fresher",
    "cgpa": 7.46,
    "batch_year": 2026,
    "branch": "CS",
    "location": "Pune",
    "skills_detected": ["Python", "Machine Learning", "Flask", "OpenCV", "SQL"]
  }}
]

Return only JSON, nothing else."""

    await asyncio.sleep(3)

    chat_completion = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
    )

    clean = chat_completion.choices[0].message.content
    clean = clean.replace("```json", "").replace("```", "").strip()
    try:
        clean = extract_json_array(clean)
        result = json.loads(clean)
    except json.JSONDecodeError:
        result = json.loads(clean)
    return result