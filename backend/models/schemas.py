from pydantic import BaseModel
from typing import List, Optional

class ResumeResult(BaseModel):
    filename: str
    text: str
    status: str

class RankRequest(BaseModel):
    job_description: str

class RankedResume(BaseModel):
    filename: str
    rank: Optional[int] = None
    score: int
    strengths: List[str]
    weaknesses: List[str]
    red_flags: List[str]
    summary: str
    detected_role: Optional[str] = None
    experience_level: Optional[str] = None
    cgpa: Optional[float] = None
    batch_year: Optional[int] = None
    branch: Optional[str] = None
    location: Optional[str] = None
    skills_detected: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []