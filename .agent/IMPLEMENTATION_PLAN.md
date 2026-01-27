# Implementation Plan: Try Before You Buy Flow & User Dashboard

## Overview
Implement guest mode for interviews and a comprehensive user dashboard with analytics.

## 1. Authentication Logic Gate ✅ (Already Partially Implemented)

### Backend Changes:
- [x] `InterviewSession` model already has optional `UserId` field
- [x] `InterviewController.StartInterview` already extracts userId from JWT claims
- [ ] Update to allow null userId for guest mode

### Frontend Changes:
- [ ] Update "Start Free" button to redirect to interview setup immediately
- [ ] Remove authentication requirement from InterviewSetup
- [ ] Add "Sign up to save this result" CTA on InterviewComplete for guest users
- [ ] Pass authentication token when available

## 2. User Dashboard (Logged-in Only)

### Backend:
- [ ] Create `DashboardModels.cs` with:
  - `DashboardSummary` (avg score, strong points, session count)
  - `SessionHistoryItem` (date, tech stack, score)
  - `SessionDetailResponse` (full transcript + feedback)

- [ ] Create `DashboardService.cs` with:
  - `GetDashboardSummaryAsync(userId)` - aggregates scores
  - `GetStrongPointsAsync(userId)` - uses Gemini to analyze top answers
  - `GetSessionDetailAsync(sessionId, userId)` - returns full session

- [ ] Create `DashboardController.cs` with:
  - `GET /api/dashboard/summary` - returns dashboard metrics
  - `GET /api/dashboard/sessions` - returns session history
  - `GET /api/dashboard/sessions/{id}` - returns session detail

### Frontend:
- [ ] Create `Dashboard.tsx` component with:
  - Average Confidence Score (progress bar)
  - Strong Points section (AI-generated summary)
  - Session History table (date, tech stack, score)
  - Click handler to view session details

- [ ] Create `SessionDetail.tsx` component:
  - Full transcript view
  - Gemini feedback display
  - Back to dashboard button

- [ ] Update routing in `App.tsx` to include dashboard route

## 3. UI/UX Updates

### InterviewSetup:
- [ ] Update "Start Free" button styling (high-action, primary)
- [ ] Remove authentication gate (allow guest mode)

### InterviewComplete:
- [ ] Add conditional CTA for guest users
- [ ] "Sign up to save this result" button with prominent styling

### Dashboard:
- [ ] Clean data visualizations
- [ ] Progress bars for scores
- [ ] Responsive table/list for session history
- [ ] Smooth transitions and animations

## 4. API Service Updates

### Frontend API Service:
- [ ] Add `getDashboardSummary()` function
- [ ] Add `getSessionHistory()` function
- [ ] Add `getSessionDetail(id)` function
- [ ] Update interview endpoints to include auth token when available

## Implementation Order:
1. Backend Models (DashboardModels.cs)
2. Backend Service (DashboardService.cs)
3. Backend Controller (DashboardController.cs)
4. Frontend API Service updates
5. Dashboard Component
6. SessionDetail Component
7. InterviewSetup updates (remove auth gate)
8. InterviewComplete updates (guest CTA)
9. App.tsx routing updates
10. Testing & Polish
