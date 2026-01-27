# Resume PDF Parsing Fix

## Problem
The interview bot was not working because it couldn't properly parse PDF resume files. The frontend was attempting to read PDF files as plain text using `FileReader.readAsText()`, which doesn't work for binary PDF files.

## Root Cause
- **Frontend Issue**: `InterviewSetup.tsx` was trying to read PDFs as text files, which returns garbled data or empty strings
- **Missing API Integration**: The frontend wasn't using the backend's `/api/extraction/resume` endpoint that properly handles PDF extraction
- **No Upload Handler**: There was no API call to send the PDF file to the backend

## Solution Implemented

### 1. Added Resume Upload API Endpoint (`frontend/src/services/api.ts`)
```typescript
export const uploadResume = async (file: File): Promise<{ text: string; success: boolean; error?: string; skills?: string[] }>
```
- Creates a `FormData` object to send the file as multipart form data
- Calls `/api/extraction/resume` endpoint on the backend
- Handles authentication token in headers
- Returns extracted text and structured data (skills, etc.)

### 2. Updated InterviewSetup Component (`frontend/src/components/InterviewSetup.tsx`)
**Key changes:**
- Added `isUploadingResume` state to track upload progress
- Added `resumeFileName` state to display the uploaded file name
- Updated `readResumeFile()` function to:
  - Validate file type (PDF, TXT, DOC, DOCX)
  - **For PDF files**: Upload to backend via `uploadResume()` API for proper parsing
  - **For text files**: Continue reading directly as before
  - Show loading spinner while extracting
  - Display filename when successfully extracted
  - Show error messages if extraction fails

**UI Improvements:**
- Added loading state with spinner while extracting resume
- Display uploaded filename
- Show extraction errors to user
- Updated file type messaging (now includes DOC/DOCX)

### 3. Backend PDF Extraction (`backend/Interviewly.API/Services/ExtractionManager.cs`)
This was already properly implemented:
- Sends PDF file to Python service at `/extract/resume` endpoint
- Python service (scraper/main.py) uses `pypdf` library to extract text
- Returns extracted text with validation

## How It Works

1. **User uploads PDF resume**
   - File is validated (must be PDF, TXT, DOC, or DOCX)
   
2. **For PDF files:**
   - Frontend sends to `/api/extraction/resume`
   - Backend forwards to Python service for PDF parsing
   - Python service extracts all text from PDF using `pypdf`
   - Backend returns extracted text to frontend
   - Frontend stores extracted text in `resumeText` state
   
3. **For text files:**
   - Frontend reads directly as text using FileReader
   - Stores in `resumeText` state
   
4. **Starting Interview:**
   - `resumeText` is passed to `/api/interview/start` endpoint
   - Backend uses resume content for context-aware questions
   - AI generates personalized questions based on resume

## Testing

To test the fix:

1. **Start the application:**
   ```bash
   # Terminal 1: Backend
   cd backend/Interviewly.API
   dotnet run
   
   # Terminal 2: Python service
   cd scraper
   python main.py
   
   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

2. **Test PDF upload:**
   - Go to http://localhost:5173
   - Click on the resume upload area
   - Select a PDF resume file
   - Watch for the extraction spinner
   - Verify it shows "Resume Extracted Successfully!" with the filename
   
3. **Verify extraction:**
   - Check browser console for any errors
   - The resume text should now be properly extracted
   
4. **Test interview:**
   - Fill in tech stack and difficulty
   - Click "Start Interview Prep"
   - Verify that questions are contextual to your resume

## Error Handling

The fix includes proper error handling for:
- Invalid file types (shows alert)
- Extraction failures (shows specific error from backend)
- Network errors (displays user-friendly error message)
- Scanned PDFs (backend detects image-based PDFs and informs user)

## Files Modified

1. `frontend/src/services/api.ts` - Added `uploadResume()` function
2. `frontend/src/components/InterviewSetup.tsx` - Updated to use proper PDF upload flow

## Backward Compatibility

- Text-based file uploads (TXT, DOC, DOCX) still work as before
- Existing interview functionality unchanged
- All API contracts preserved
