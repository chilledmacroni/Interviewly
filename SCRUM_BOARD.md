# 📋 Interviewly Scrum Board

## ✅ Done
**Core Infrastructure & Setup**
- [x] **Backend**: Initialized ASP.NET Core Web API on port 5000.
- [x] **Scraper**: Built Python FastAPI microservice with Crawl4AI on port 8000.
- [x] **Frontend**: Set up React + Vite + Tailwind CSS project on port 5173/5174.
- [x] **Database**: Configured MongoDB connection and schema models (`InterviewSession`).

**Backend Development**
- [x] **Gemini Integration**: Replaced SDK with robust direct `HttpClient` REST API implementation.
- [x] **Agentic Logic**: Developed `Interviewer` and `Scorer` system prompts.
- [x] **API Endpoints**: Implemented `/start`, `/answer`, and `/session/{id}` endpoints.
- [x] **Scraper Service**: Connected Backend to Python Scraper for Job Description extraction.

**Frontend Design & Features**
- [x] **"IntervAI" Redesign**: Implemented new Emerald/Dark aesthetic.
- [x] **Landing Page**: Built `InterviewSetup` with resume upload (drag & drop) and URL input.
- [x] **Dashboard Layout**: Created split-screen `InterviewSession` (Chat Left | Analysis Right).
- [x] **Smart Widgets**: Built `ConfidenceMeter`, `ActionableTips`, and `JdAlignment` components.
- [x] **Chat UI**: Styled "AI" vs "User" message bubbles with distinct themes.

**Bug Fixes**
- [x] **Scraper Compatibility**: Updated `crawl4ai` implementation to use `AsyncWebCrawler`.
- [x] **API Connectivity**: Refactored `api.ts` to fix module export errors.
- [x] **Port Handling**: Resolved port conflicts allowing services to run via npm/dotnet commands.

---

## 🚧 In Progress
- [ ] **Full End-to-End Testing**: Verifying the complete flow from "Upload Resume" -> "Scrape JD" -> "Start Interview".
- [ ] **Widget Data Wiring**: Ensuring `JdAlignment` and `ActionableTips` receive dynamic data from the backend (currently partially mocked or dependent on score).
- [ ] **Resume Parsing**: Improving client-side file reading to support PDF extraction robustly (current implementation is basic text).

---

## 📝 To Do (Backlog)
- [ ] **Voice Interaction**: Implement Speech-to-Text for the "Record" button in the interview interface, allowing users to speak answers.
- [ ] **Response Streaming**: Re-enable token-by-token streaming from Gemini for a more "human-like" conversation speed.
- [x] **User Authentication**: Add login/signup to save progress and view past history.
- [x] **History Dashboard**: Create a "Past Interviews" view to track improvement over time.
- [x] **Try Before You Buy Flow**: Allow guest users to complete interviews without authentication, with CTA to sign up.
- [x] **User Dashboard**: Comprehensive dashboard with average score, strong points (AI-generated), and session history.
- [x] **Session Detail View**: Full transcript and feedback view for past interviews.
- [ ] **Advanced JD Analysis**: Implement deeper logic to compare Resume keywords vs Job Description keywords for the `JdAlignment` widget.
- [ ] **Deployment**: Dockerize the application stack for easy cloud deployment.

---

## 🎉 Recently Completed
- **Guest Mode**: Users can now start interviews without logging in
- **Dashboard Service**: Created DashboardService with Gemini integration for strong points analysis
- **Dashboard UI**: Built comprehensive dashboard with score visualization and session history
- **Session Detail**: Detailed view of past interviews with full transcript and feedback
- **Guest CTA**: Added prominent sign-up call-to-action for guest users after completing interviews
- **API Endpoints**: New `/api/dashboard/summary`, `/api/dashboard/sessions`, and `/api/dashboard/sessions/{id}` endpoints

---

## ⛔ Impediments / Blockers
- **Port Conflicts**: Local development ports (5000, 5173) frequently locked by previous sessions. *Mitigation: Check console for active port (e.g., Frontend moved to 5174).*
- **Browser PDF support**: Reading PDFs directly in javascript without a heavy library is limited. May need to move parsing to backend.

---

## 📅 Daily Scrum Meeting (DSM)

**What has been done today (Plan vs. Achieved)**
*   **Plan**: Implement Advanced Extraction Pipeline for Resume (PDF) and Job Description (URL).
*   **Achieved**:
    *   Updated Python Scraper Service: Added `pypdf` for resume parsing and updated `main.py` with `/extract/resume` endpoint.
    *   Backend Infrastructure: Created `ExtractionManager` service and `ExtractionController` to handle file uploads and URL scraping coordination.
    *   Data Architecture: Updated `InterviewModels` with structured DTOs (`ResumeExtractionResult`, `JdExtractionResult`).
*   **Variance**: Moved PDF parsing logic to Backend (Python Microservice) instead of Frontend as originally planned, for better reliability.

**Plan for the Next Day**
*   Update `InterviewService` logic to strictly enforce "Values-based" and "Gap Analysis" questions using the new extracted data.
*   Update the System Prompt (`INTERVIEWER_SYSTEM_PROMPT`) to consume the structured Resume/JD context.
*   Verify the end-to-end flow.

**Impediments**
*   **Risks**: Ensuring the Gemini model strictly adheres to the "2 values-based questions" rule may require prompt tuning.
