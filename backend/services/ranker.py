from groq import AsyncGroq
import os
import json
import asyncio
import re
from dotenv import load_dotenv

load_dotenv()

# We expect the router/main to check if this exists, but we can do a fallback
api_key = os.environ.get("GROQ_API_KEY", "")
client = AsyncGroq(api_key=api_key) if api_key else None

def extract_json_array(text: str) -> str:
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1:
        return text[start:end+1]
    # Fallback for single object instead of array
    start_obj = text.find('{')
    end_obj = text.rfind('}')
    if start_obj != -1 and end_obj != -1:
        return "[" + text[start_obj:end_obj+1] + "]"
    return text

def custom_tokenizer(text: str):
    """
    Robust tokenizer for TF-IDF that lowercases, extracts alphabetic words,
    and standardizes common tech synonyms.
    """
    text = text.lower()
    # Standardize common terms to avoid brittleness
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
    
    # Extract only alphabetic words (length >= 2)
    words = re.findall(r'\b[a-z]{2,}\b', text)
    return words

def rank_resumes_tfidf(job_description: str, resumes: list) -> list:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    texts = [job_description] + [r['text'] for r in resumes]
    # Use custom tokenizer and english stop words
    vectorizer = TfidfVectorizer(stop_words='english', tokenizer=custom_tokenizer, token_pattern=None)
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

async def _rank_single_resume(job_description: str, resume: dict, sem: asyncio.Semaphore) -> dict:
    async with sem:
        prompt = f"""You are a senior recruiter. Analyze this resume for the following job description.

Job Description:
{job_description}

Resume - {resume['filename']}:
{resume['text']}

Extract and provide:
1. Score out of 100
2. Top 3 strengths
3. Top 3 weaknesses
4. Red flags (if any)
5. One line summary
6. Detected role (exactly one of: Web Developer, ML/AI Engineer, Java Developer, Python Developer, Data Analyst, DevOps Engineer, Mobile Developer, UI/UX Designer, Product Manager, QA Tester, Cloud Architect, Business Analyst, HR/Recruiter, Cyber Security, Other)
7. Experience level (exactly one of: Fresher, 1-2 years, 3-5 years, 5+ years)
8. CGPA (extract exact number from resume, null if not found)
9. Batch year (graduation year as number, null if not found)
10. Branch (e.g. CS, IT, ENTC, Mechanical, null if not found)
11. Location (city name if mentioned, null if not found)
12. Top 5 skills detected (as list)
13. Missing skills (skills mentioned in JD but missing in this resume, as list)

Respond in this exact JSON format:
[
  {{
    "filename": "{resume['filename']}",
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

        try:
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
            )
            clean = chat_completion.choices[0].message.content
            clean = clean.replace("```json", "").replace("```", "").strip()
            
            clean = extract_json_array(clean)
            result = json.loads(clean)
            if isinstance(result, list) and len(result) > 0:
                # Force filename to match in case LLM hallucinated it
                result[0]["filename"] = resume['filename']
                return result[0]
            elif isinstance(result, dict):
                result["filename"] = resume['filename']
                return result
        except Exception as e:
            print(f"Error parsing resume {resume['filename']}: {str(e)}")
            
        # Fallback if parsing fails entirely for this chunk
        return {
            "filename": resume['filename'],
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "red_flags": ["LLM processing failed for this resume."],
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
    if not client:
        raise Exception("GROQ_API_KEY is missing or invalid.")
    
    # Use a semaphore to prevent hitting Groq rate limits
    sem = asyncio.Semaphore(4)
    tasks = [_rank_single_resume(job_description, r, sem) for r in resumes]
    results = await asyncio.gather(*tasks)
    
    # Sort results by score and assign ranks
    results.sort(key=lambda x: x.get('score', 0), reverse=True)
    for idx, r in enumerate(results):
        r['rank'] = idx + 1
        
    return results

async def _auto_sort_single_resume(resume: dict, sem: asyncio.Semaphore) -> dict:
    async with sem:
        prompt = f"""You are a senior recruiter. Analyze this resume and categorize it by role.

Resume - {resume['filename']}:
{resume['text']}

Extract and provide:
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
    "filename": "{resume['filename']}",
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

        try:
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
            )
            clean = chat_completion.choices[0].message.content
            clean = clean.replace("```json", "").replace("```", "").strip()
            
            clean = extract_json_array(clean)
            result = json.loads(clean)
            if isinstance(result, list) and len(result) > 0:
                result[0]["filename"] = resume['filename']
                return result[0]
            elif isinstance(result, dict):
                result["filename"] = resume['filename']
                return result
        except Exception as e:
            print(f"Error parsing resume {resume['filename']}: {str(e)}")
            
        return {
            "filename": resume['filename'],
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "red_flags": ["LLM processing failed for this resume."],
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
    if not client:
        raise Exception("GROQ_API_KEY is missing or invalid.")
        
    sem = asyncio.Semaphore(4)
    tasks = [_auto_sort_single_resume(r, sem) for r in resumes]
    results = await asyncio.gather(*tasks)
    
    results.sort(key=lambda x: x.get('score', 0), reverse=True)
    for idx, r in enumerate(results):
        r['rank'] = idx + 1
        
    return results