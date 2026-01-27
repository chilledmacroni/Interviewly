from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from crawl4ai import AsyncWebCrawler
# from crawl4ai.extraction_strategy import LLMExtractionStrategy # Commented out as we are not using LLM extraction yet
import uvicorn
import logging
from pypdf import PdfReader
import io
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Crawl4AI Scraper Service",
    description="Web scraping and PDF extraction microservice for Interviewly",
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

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest):
    """
    Scrape content from a URL with JavaScript rendering support
    """
    try:
        logger.info(f"[SCRAPER] Starting scrape for URL: {request.url}")
        print(f"[DEBUG] Processing URL: {request.url}")
        
        # Use AsyncWebCrawler as context manager with JS support
        try:
            async with AsyncWebCrawler(verbose=True) as crawler:
                print(f"[DEBUG] Crawler initialized")
                # Run the crawler - Simplified parameters for stability
                result = await crawler.arun(
                    url=str(request.url),
                    word_count_threshold=10,
                    bypass_cache=True,
                    # Remove js_code for now if it's causing issues, or use simple
                    # js_code=["window.scrollTo(0, document.body.scrollHeight);"],
                    # wait_for=2 
                )
                print(f"[DEBUG] Crawler finished. Success: {result.success}")
                
                if not result.success:
                    error_msg = result.error_message or 'Unknown error'
                    logger.error(f"[SCRAPER] Crawl failed for {request.url}: {error_msg}")
                    return ScrapeResponse(
                        content="",
                        title=None,
                        success=False,
                        error=f"Scrape failed: {error_msg}"
                    )
                
                # Extract content
                if request.extract_markdown and result.markdown:
                    content = result.markdown
                else:
                    content = result.cleaned_html or result.html
                
                print(f"[DEBUG] Content extracted: {len(content or '')} chars")
                
                # Clean content if requested
                if request.clean_content and content:
                    # Remove excessive whitespace
                    content = '\n'.join(line.strip() for line in content.split('\n') if line.strip())
                
                # Validate we got meaningful content
                if not content or len(content.strip()) < 50:
                    logger.warning(f"[SCRAPER] Very little content extracted from {request.url} ({len(content or '')} chars)")
                    # Don't fail, just return what we have with a warning in error field if needed? 
                    # Or fail if strictly empty. 
                    if not content:
                         return ScrapeResponse(
                            content="",
                            title=result.title,
                            success=False,
                            error="Extracted content is empty"
                        )
                
                logger.info(f"[SCRAPER] ✓ Successfully scraped {len(content)} characters from {request.url}")
                
                # Post-process for structure
                structure = extract_jd_structure(content)
                
                return ScrapeResponse(
                    content=content,
                    title=result.title,
                    success=True,
                    company_values=structure["company_values"],
                    required_skills=structure["required_skills"],
                    responsibilities=structure["responsibilities"]
                )

        except Exception as inner_e:
            import traceback
            trace = traceback.format_exc()
            print(f"[DEBUG] Inner crawler exception: {trace}")
            raise inner_e
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        logger.error(f"[SCRAPER] Main crawler failed for {request.url}: {str(e)}\n{trace}")
        print(f"[DEBUG] Main crawler failed. Attempting fallback with requests.")

        # Fallback to requests + BeautifulSoup
        try:
            import requests
            from bs4 import BeautifulSoup
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(str(request.url), headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            # Kill javascript and style elements
            for script in soup(["script", "style"]):
                script.extract()
                
            text = soup.get_text()
            
            # Simple cleaning
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_text = '\n'.join(chunk for chunk in chunks if chunk)
            
            logger.info(f"[SCRAPER] Fallback successful for {request.url}. Extracted {len(clean_text)} chars.")
            
            structure = extract_jd_structure(clean_text)
            
            return ScrapeResponse(
                content=clean_text,
                title=soup.title.string if soup.title else None,
                success=True,
                company_values=structure["company_values"],
                required_skills=structure["required_skills"],
                responsibilities=structure["responsibilities"]
            )
            
        except Exception as fallback_e:
            logger.error(f"[SCRAPER] Fallback also failed: {str(fallback_e)}", exc_info=True)
            return ScrapeResponse(
                content="",
                title=None,
                success=False,
                error=f"Scraping failed (Crawler: {str(e)}, Fallback: {str(fallback_e)})"
            )

@app.post("/extract/resume", response_model=ResumeExtractionResponse)
async def extract_resume(file: UploadFile = File(...)):
    """
    Extract text from a Resume PDF with validation
    """
    try:
        logger.info(f"[PDF PARSER] Starting extraction for: {file.filename}")
        
        if not file.filename.lower().endswith('.pdf'):
            logger.error(f"[PDF PARSER] Invalid file type: {file.filename}")
            return ResumeExtractionResponse(
                text="",
                success=False,
                error="Only PDF files are supported"
            )

        content = await file.read()
        logger.info(f"[PDF PARSER] Read {len(content)} bytes from {file.filename}")
        
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        
        logger.info(f"[PDF PARSER] PDF has {len(reader.pages)} pages")
        
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                logger.info(f"[PDF PARSER] Page {i+1}: extracted {len(page_text)} chars")
            else:
                logger.warning(f"[PDF PARSER] Page {i+1}: no text extracted (may be scanned image)")
        
        # Validate extraction
        if not text or len(text.strip()) < 20:
            logger.error(f"[PDF PARSER] Extraction failed or PDF is scanned. Got {len(text)} chars")
            return ResumeExtractionResponse(
                text=text,
                success=False,
                error="PDF appears to be empty or scanned (image-based). Please use a text-based PDF or OCR the document first."
            )
            
        # Structure extraction (Simple)
        structure = extract_resume_structure(text)

        logger.info(f"[PDF PARSER] ✓ Successfully extracted {len(text)} characters from {file.filename}")
        
        return ResumeExtractionResponse(
            text=text,
            success=True,
            skills=structure["skills"],
            projects=structure["projects"]
        )

    except Exception as e:
        logger.error(f"[PDF PARSER] Exception extracting {file.filename}: {str(e)}", exc_info=True)
        return ResumeExtractionResponse(
            text="",
            success=False,
            error=f"Resume extraction failed: {str(e)}"
        )

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
        reload=True,
        log_level="info"
    )
