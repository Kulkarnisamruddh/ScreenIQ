from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from services.parser import extract_text_from_pdf
from services.ranker import rank_resumes, auto_sort_resumes
from models.schemas import ResumeResult, RankedResume

router = APIRouter()

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
        text = extract_text_from_pdf(file.file)
        results.append(ResumeResult(
            filename=file.filename,
            text=text,
            status="success"
        ))
    return results

@router.post("/rank")
async def rank_uploaded_resumes(
    files: List[UploadFile] = File(...),
    job_description: str = Form(...)
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
        text = extract_text_from_pdf(file.file)
        resumes.append({
            "filename": file.filename,
            "text": text
        })

    if not resumes:
        raise HTTPException(status_code=400, detail="No valid PDF files uploaded")

    ranked = await rank_resumes(job_description, resumes)
    return ranked

@router.post("/auto-sort")
async def auto_sort_uploaded_resumes(
    files: List[UploadFile] = File(...)
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
        text = extract_text_from_pdf(file.file)
        resumes.append({
            "filename": file.filename,
            "text": text
        })

    if not resumes:
        raise HTTPException(status_code=400, detail="No valid PDF files uploaded")

    sorted_results = await auto_sort_resumes(resumes)
    return sorted_results