from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from services.parser import extract_text_from_pdf
from services.ranker import rank_resumes, auto_sort_resumes
from models.schemas import ResumeResult, RankedResume
from supabase_client import supabase

router = APIRouter()

async def get_user_from_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        user_resp = supabase.auth.get_user(token)
        return user_resp.user
    except Exception as e:
        print("Auth error:", str(e))
        return None

@router.post("/upload")
async def upload_resumes(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            results.append(ResumeResult(
                filename=file.filename,
                text="",
                status="error - not a PDF"
            ))
            continue
        text = await run_in_threadpool(extract_text_from_pdf, file.file)
        results.append(ResumeResult(
            filename=file.filename,
            text=text,
            status="success"
        ))
    return results

@router.post("/rank")
async def rank_uploaded_resumes(
    files: List[UploadFile] = File(...),
    job_description: str = Form(...),
    method: str = Form("llm"),
    authorization: Optional[str] = Header(None)
):
    if len(files) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 resumes allowed per screening."
        )

    resumes = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            continue
        # Unblock event loop
        text = await run_in_threadpool(extract_text_from_pdf, file.file)
        resumes.append({
            "filename": file.filename,
            "text": text
        })

    if not resumes:
        raise HTTPException(status_code=400, detail="No valid PDF files uploaded")

    if method == "tfidf":
        from services.ranker import rank_resumes_tfidf
        ranked = rank_resumes_tfidf(job_description, resumes)
    else:
        ranked = await rank_resumes(job_description, resumes)
        
    # Handle DB Writes securely on backend
    user = await get_user_from_token(authorization)
    if user:
        try:
            # Create session
            session_resp = supabase.table("sessions").insert({
                "user_id": user.id,
                "job_title": job_description[:50],
                "job_description": job_description,
                "total_resumes": len(ranked)
            }).execute()
            
            if session_resp.data:
                session_id = session_resp.data[0]['id']
                # Create resume rows
                resume_rows = []
                for r in ranked:
                    resume_rows.append({
                        "session_id": session_id,
                        "filename": r.get('filename'),
                        "rank": r.get('rank'),
                        "score": r.get('score'),
                        "summary": r.get('summary'),
                        "strengths": r.get('strengths'),
                        "weaknesses": r.get('weaknesses'),
                        "red_flags": r.get('red_flags'),
                        "detected_role": r.get('detected_role'),
                        "experience_level": r.get('experience_level'),
                        "cgpa": r.get('cgpa'),
                        "batch_year": r.get('batch_year'),
                        "branch": r.get('branch'),
                        "location": r.get('location'),
                        "skills_detected": r.get('skills_detected'),
                        "missing_skills": r.get('missing_skills')
                    })
                supabase.table("resume_results").insert(resume_rows).execute()
        except Exception as e:
            print("Failed to save to Supabase:", str(e))
            # Even if DB fails, return ranked data to user
            
    return ranked

@router.post("/auto-sort")
async def auto_sort_uploaded_resumes(
    files: List[UploadFile] = File(...),
    authorization: Optional[str] = Header(None)
):
    if len(files) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 resumes allowed per screening."
        )

    resumes = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            continue
        text = await run_in_threadpool(extract_text_from_pdf, file.file)
        resumes.append({
            "filename": file.filename,
            "text": text
        })

    if not resumes:
        raise HTTPException(status_code=400, detail="No valid PDF files uploaded")

    sorted_results = await auto_sort_resumes(resumes)
    
    # Handle DB Writes securely on backend
    user = await get_user_from_token(authorization)
    if user:
        try:
            # Create session
            session_resp = supabase.table("sessions").insert({
                "user_id": user.id,
                "job_title": "Auto-Sort",
                "job_description": "Auto-Sort",
                "total_resumes": len(sorted_results)
            }).execute()
            
            if session_resp.data:
                session_id = session_resp.data[0]['id']
                # Create resume rows
                resume_rows = []
                for r in sorted_results:
                    resume_rows.append({
                        "session_id": session_id,
                        "filename": r.get('filename'),
                        "rank": r.get('rank'),
                        "score": r.get('score'),
                        "summary": r.get('summary'),
                        "strengths": r.get('strengths'),
                        "weaknesses": r.get('weaknesses'),
                        "red_flags": r.get('red_flags'),
                        "detected_role": r.get('detected_role'),
                        "experience_level": r.get('experience_level'),
                        "cgpa": r.get('cgpa'),
                        "batch_year": r.get('batch_year'),
                        "branch": r.get('branch'),
                        "location": r.get('location'),
                        "skills_detected": r.get('skills_detected'),
                        "missing_skills": r.get('missing_skills')
                    })
                supabase.table("resume_results").insert(resume_rows).execute()
        except Exception as e:
            print("Failed to save to Supabase:", str(e))
            
    return sorted_results