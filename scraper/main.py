from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

import uvicorn
import logging

import io
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Resume Extraction Service",
    description="Minimal PDF/DOCX/TXT resume extraction microservice for Interviewly",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "https://localhost:7001", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapeRequest(BaseModel):
    url: HttpUrl
    extract_markdown: bool = True
    clean_content: bool = True

class ScrapeResponse(BaseModel):
    content: str
    title: str | None = None
    success: bool = True
    error: str | None = None
    # Structured fields
    company_values: list[str] = []
    required_skills: list[str] = []
    responsibilities: list[str] = []

class ResumeExtractionResponse(BaseModel):
    text: str
    success: bool = True
    error: str | None = None
    # Structured fields
    skills: list[str] = []
    projects: list[str] = []

# Heuristic extraction helpers
def extract_jd_structure(markdown_text: str) -> dict:
    """
    Heuristic extraction of structured fields from JD markdown
    """
    structure = {
        "company_values": [],
        "required_skills": [],
        "responsibilities": []
    }
    
    # Simple regex-based section finding (naive but better than nothing)
    # Looking for headers like "Values", "Culture", "Skills", "Requirements", "Responsibilities"
    
    sections = re.split(r'^##+\s+', markdown_text, flags=re.MULTILINE)
    
    for section in sections:
        header_match = re.match(r'([^\n]+)', section)
        if not header_match:
            continue
            
        header = header_match.group(1).lower()
        content = section[len(header):].strip()
        
        # bullets extraction
        bullets = [line.strip().lstrip('-*•').strip() for line in content.split('\n') if line.strip().startswith(('- ', '* ', '• '))]
        
        if any(w in header for w in ['value', 'culture', 'mission']):
            structure["company_values"].extend(bullets)
        elif any(w in header for w in ['skill', 'requirement', 'qualif', 'stack', 'tech']):
            structure["required_skills"].extend(bullets)
        elif any(w in header for w in ['responsib', 'duties', 'what you will do', 'role']):
            structure["responsibilities"].extend(bullets)
            
    return structure

def extract_resume_structure(text: str) -> dict:
    """
    Simple heuristic to find skills in resume text
    """
    structure = {
        "skills": [],
        "projects": []
    }
    
    # Very basic "Skills" section finding
    lower_text = text.lower()
    
    # Try to find a line starting with "Skills"
    lines = text.split('\n')
    in_skills = False
    for line in lines:
        clean_line = line.strip()
        if re.match(r'^(technical )?skills', clean_line, re.IGNORECASE):
            in_skills = True
            continue
        
        if in_skills:
            if not clean_line: continue
            if re.match(r'^[A-Z][a-z]+:', clean_line): # Next section header?
                in_skills = False
                continue
            # Assume these are skills
            if ',' in clean_line:
                skills = [s.strip() for s in clean_line.split(',')]
                structure["skills"].extend(skills)
            else:
                structure["skills"].append(clean_line)
                
    return structure

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Crawl4AI Scraper",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "crawler_initialized": True
    }

# URL scraping removed: service only exposes resume extraction (/extract/resume) to keep the microservice minimal and stable.

@app.post("/extract/resume", response_model=ResumeExtractionResponse)
async def extract_resume(file: UploadFile = File(...)):
    try:
        logger.info(f"[RESUME PARSER] Starting extraction for: {file.filename}")
        lower = file.filename.lower()
        if not (lower.endswith('.pdf') or lower.endswith('.docx') or lower.endswith('.txt')):
            return ResumeExtractionResponse(text="", success=False, error="Only PDF, DOCX, or TXT files are supported")

        content = await file.read()
        text = ""

        if lower.endswith('.pdf'):
            try:
                from pypdf import PdfReader
                pdf_file = io.BytesIO(content)
                reader = PdfReader(pdf_file)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
            except Exception as e:
                logger.error("PDF parsing failed: %s", e)
                return ResumeExtractionResponse(text="", success=False, error=f"PDF parsing failed: {e}")
        elif lower.endswith('.docx'):
            try:
                from docx import Document
                doc = Document(io.BytesIO(content))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                text = '\n'.join(paragraphs)
            except Exception as e:
                logger.error("DOCX parsing failed: %s", e)
                return ResumeExtractionResponse(text="", success=False, error=f"DOCX parsing failed: {e}")
        else:
            # TXT
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('latin-1')

        if not text or len(text.strip()) < 20:
            return ResumeExtractionResponse(text=text, success=False, error="File appears to be empty or too short")

        structure = extract_resume_structure(text)
        logger.info("[RESUME PARSER] Extracted %d chars", len(text))
        return ResumeExtractionResponse(text=text, success=True, skills=structure['skills'], projects=structure['projects'])
    except Exception as e:
        logger.error("Resume extraction exception: %s", e, exc_info=True)
        return ResumeExtractionResponse(text="", success=False, error=str(e))

@app.post("/scrape/simple")
async def scrape_simple(url: str):
    """
    Simple scrape endpoint that just takes a URL string
    """
    try:
        request = ScrapeRequest(url=url)
        result = await scrape_url(request)
        return {"content": result.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
