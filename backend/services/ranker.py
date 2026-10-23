from groq import AsyncGroq
import os
import json
import asyncio
import re
from dotenv import load_dotenv

load_dotenv()

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY", "")
    return AsyncGroq(api_key=api_key) if api_key else None

GROQ_MODELS = [
    os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b"),
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b"
]

def extract_json_data(text: str):
    text = text.replace("```json", "").replace("```", "").strip()
    # Try parsing directly
    try:
        return json.loads(text)
    except Exception:
        pass
    # Find outer curly braces
    s_obj = text.find('{')
    e_obj = text.rfind('}')
    if s_obj != -1 and e_obj != -1:
        try:
            return json.loads(text[s_obj:e_obj+1])
        except Exception:
            pass
    # Find outer square brackets
    s_arr = text.find('[')
    e_arr = text.rfind(']')
    if s_arr != -1 and e_arr != -1:
        try:
            arr = json.loads(text[s_arr:e_arr+1])
            if isinstance(arr, list) and len(arr) > 0:
                return arr[0]
        except Exception:
            pass
    return None

def custom_tokenizer(text: str):
    """
    Robust tokenizer for TF-IDF that lowercases, extracts alphabetic words,
    and standardizes common tech synonyms.
    """
    text = text.lower()
    replacements = {
        r'\breact\.js\b': 'reactjs',
        r'\bnode\.js\b': 'nodejs',
        r'\bvue\.js\b': 'vuejs',
        r'\bmachine learning\b': 'ml',
        r'\bartificial intelligence\b': 'ai',
        r'\bfront-end\b': 'frontend',
        r'\bback-end\b': 'backend'
    }
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
    
    words = re.findall(r'\b[a-z]{2,}\b', text)
    return words

def rank_resumes_tfidf(job_description: str, resumes: list) -> list:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    texts = [job_description] + [r['text'] for r in resumes]
    vectorizer = TfidfVectorizer(stop_words='english', tokenizer=custom_tokenizer, token_pattern=None)
    tfidf_matrix = vectorizer.fit_transform(texts)
    
    cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    
    results = []
    for i, raw_score in enumerate(cosine_similarities):
        # Calibrate TF-IDF cosine similarity: in NLP keyword comparison, 0.35+ is top tier match
        calibrated_score = min(100, max(0, int((raw_score / 0.35) * 100))) if raw_score > 0 else 0
        results.append({
            "filename": resumes[i]['filename'],
            "rank": 0,
            "score": calibrated_score,
            "strengths": ["Matched relevant tech keywords based on TF-IDF vectorization"],
            "weaknesses": ["TF-IDF cannot analyze contextual work experience"],
            "red_flags": [],
            "summary": f"Ranked mathematically via TF-IDF ({calibrated_score}/100 fit, cosine similarity {raw_score:.2f}).",
            "detected_role": "Unknown",
            "experience_level": "Unknown",
            "cgpa": None,
            "batch_year": None,
            "branch": None,
            "location": None,
            "skills_detected": [],
            "missing_skills": []
        })
        
    results.sort(key=lambda x: x['score'], reverse=True)
    for idx, r in enumerate(results):
        r['rank'] = idx + 1
        
    return results

async def _rank_single_resume(job_description: str, resume: dict, sem: asyncio.Semaphore) -> dict:
    async with sem:
        client = get_groq_client()
        if not client:
            return {
                "filename": resume['filename'],
                "score": 0,
                "strengths": [],
                "weaknesses": [],
                "red_flags": ["GROQ_API_KEY is not configured on the server."],
                "summary": "GROQ_API_KEY missing.",
                "detected_role": "Unknown",
                "experience_level": "Unknown",
                "cgpa": None,
                "batch_year": None,
                "branch": None,
                "location": None,
                "skills_detected": [],
                "missing_skills": []
            }

        prompt = f"""You are a senior technical recruiter. Analyze this resume against the job description.

Job Description:
{job_description}

Resume - {resume['filename']}:
{resume['text']}

Return a single JSON object with these exact keys:
{{
  "filename": "{resume['filename']}",
  "score": 85,
  "strengths": ["top strength 1", "top strength 2", "top strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "red_flags": [],
  "summary": "concise 1-sentence summary",
  "detected_role": "Python Developer",
  "experience_level": "Fresher",
  "cgpa": 7.5,
  "batch_year": 2026,
  "branch": "CS",
  "location": "City or null",
  "skills_detected": ["Python", "FastAPI"],
  "missing_skills": ["AWS"]
}}

Role must be one of: Web Developer, ML/AI Engineer, Java Developer, Python Developer, Data Analyst, DevOps Engineer, Mobile Developer, UI/UX Designer, Product Manager, QA Tester, Cloud Architect, Business Analyst, HR/Recruiter, Cyber Security, Other.
Experience level must be one of: Fresher, 1-2 years, 3-5 years, 5+ years.
Return valid JSON only."""

        last_error = ""
        for model_name in GROQ_MODELS:
            try:
                chat_completion = await client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_name,
                    response_format={"type": "json_object"}
                )
                raw_content = chat_completion.choices[0].message.content
                data = extract_json_data(raw_content)
                if data and isinstance(data, dict):
                    data["filename"] = resume['filename']
                    data["score"] = int(data.get("score", 0))
                    return data
            except Exception as e:
                last_error = str(e)
                print(f"Error with model {model_name} on {resume['filename']}: {last_error}")
                continue
            
        return {
            "filename": resume['filename'],
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "red_flags": [f"LLM processing failed: {last_error[:80]}" if last_error else "LLM parsing failed."],
            "summary": "Failed to parse resume.",
            "detected_role": "Unknown",
            "experience_level": "Unknown",
            "cgpa": None,
            "batch_year": None,
            "branch": None,
            "location": None,
            "skills_detected": [],
            "missing_skills": []
        }

async def rank_resumes(job_description: str, resumes: list) -> list:
    client = get_groq_client()
    if not client:
        raise Exception("GROQ_API_KEY is missing or invalid.")
    
    sem = asyncio.Semaphore(4)
    tasks = [_rank_single_resume(job_description, r, sem) for r in resumes]
    results = await asyncio.gather(*tasks)
    
    results.sort(key=lambda x: x.get('score', 0), reverse=True)
    for idx, r in enumerate(results):
        r['rank'] = idx + 1
        
    return results

async def _auto_sort_single_resume(resume: dict, sem: asyncio.Semaphore) -> dict:
    async with sem:
        client = get_groq_client()
        if not client:
            return {
                "filename": resume['filename'],
                "score": 0,
                "strengths": [],
                "weaknesses": [],
                "red_flags": ["GROQ_API_KEY is not configured on the server."],
                "summary": "GROQ_API_KEY missing.",
                "detected_role": "Unknown",
                "experience_level": "Unknown",
                "cgpa": None,
                "batch_year": None,
                "branch": None,
                "location": None,
                "skills_detected": []
            }

        prompt = f"""You are a senior technical recruiter. Categorize and evaluate this resume.

Resume - {resume['filename']}:
{resume['text']}

Return a single JSON object with these exact keys:
{{
  "filename": "{resume['filename']}",
  "score": 85,
  "strengths": ["top strength 1", "top strength 2", "top strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "red_flags": [],
  "summary": "concise 1-sentence summary",
  "detected_role": "Python Developer",
  "experience_level": "Fresher",
  "cgpa": 7.5,
  "batch_year": 2026,
  "branch": "CS",
  "location": "City or null",
  "skills_detected": ["Python", "FastAPI"]
}}

Role must be one of: Web Developer, ML/AI Engineer, Java Developer, Python Developer, Data Analyst, DevOps Engineer, Mobile Developer, UI/UX Designer, Product Manager, QA Tester, Cloud Architect, Business Analyst, HR/Recruiter, Cyber Security, Other.
Experience level must be one of: Fresher, 1-2 years, 3-5 years, 5+ years.
Return valid JSON only."""

        last_error = ""
        for model_name in GROQ_MODELS:
            try:
                chat_completion = await client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_name,
                    response_format={"type": "json_object"}
                )
                raw_content = chat_completion.choices[0].message.content
                data = extract_json_data(raw_content)
                if data and isinstance(data, dict):
                    data["filename"] = resume['filename']
                    data["score"] = int(data.get("score", 0))
                    return data
            except Exception as e:
                last_error = str(e)
                print(f"Error with model {model_name} on {resume['filename']}: {last_error}")
                continue
            
        return {
            "filename": resume['filename'],
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "red_flags": [f"LLM processing failed: {last_error[:80]}" if last_error else "LLM parsing failed."],
            "summary": "Failed to parse resume.",
            "detected_role": "Unknown",
            "experience_level": "Unknown",
            "cgpa": None,
            "batch_year": None,
            "branch": None,
            "location": None,
            "skills_detected": []
        }

async def auto_sort_resumes(resumes: list) -> list:
    client = get_groq_client()
    if not client:
        raise Exception("GROQ_API_KEY is missing or invalid.")
        
    sem = asyncio.Semaphore(4)
    tasks = [_auto_sort_single_resume(r, sem) for r in resumes]
    results = await asyncio.gather(*tasks)
    
    results.sort(key=lambda x: x.get('score', 0), reverse=True)
    for idx, r in enumerate(results):
        r['rank'] = idx + 1
        
    return results