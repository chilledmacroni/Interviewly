# 📡 API Reference

## Backend API (ASP.NET Core)

**Base URL**: `http://localhost:5000/api/interview`

### 1. Start Interview

**Endpoint**: `POST /start`

**Request Body**:
```json
{
  "techStack": "React, TypeScript, Node.js",
  "difficulty": "medium",
  "resumeText": "Optional: Your resume text here...",
  "jdUrl": "Optional: https://example.com/job-posting"
}
```

**Response**:
```json
{
  "sessionId": "65f8a9b2c3d4e5f6g7h8i9j0",
  "question": "Can you explain the difference between useState and useReducer in React?",
  "questionNumber": 1,
  "totalQuestions": 7,
  "isComplete": false
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:5000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "techStack": "React, TypeScript",
    "difficulty": "medium",
    "resumeText": "3 years React experience..."
  }'
```

---

### 2. Submit Answer

**Endpoint**: `POST /answer`

**Request Body**:
```json
{
  "sessionId": "65f8a9b2c3d4e5f6g7h8i9j0",
  "answer": "useState is for simple state, useReducer is for complex state with multiple sub-values..."
}
```

**Response**:
```json
{
  "interviewResponse": {
    "sessionId": "65f8a9b2c3d4e5f6g7h8i9j0",
    "question": "Next question here...",
    "questionNumber": 2,
    "totalQuestions": 7,
    "isComplete": false
  },
  "score": {
    "score": 8,
    "feedback": "Great answer! You correctly identified the key differences...",
    "strengths": [
      "Clear explanation of useState",
      "Good understanding of use cases"
    ],
    "improvements": [
      "Could mention performance implications",
      "Add example of when to use each"
    ]
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:5000/api/interview/answer \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "65f8a9b2c3d4e5f6g7h8i9j0",
    "answer": "useState is for simple state..."
  }'
```

---

### 3. Get Session

**Endpoint**: `GET /session/{sessionId}`

**Response**:
```json
{
  "id": "65f8a9b2c3d4e5f6g7h8i9j0",
  "createdAt": "2026-01-21T12:00:00Z",
  "techStack": "React, TypeScript, Node.js",
  "difficulty": "medium",
  "conversation": [
    {
      "role": "interviewer",
      "content": "Question 1...",
      "timestamp": "2026-01-21T12:00:00Z"
    },
    {
      "role": "candidate",
      "content": "Answer 1...",
      "timestamp": "2026-01-21T12:01:00Z",
      "score": 8
    }
  ],
  "scores": [
    {
      "questionNumber": 1,
      "question": "Question 1...",
      "answer": "Answer 1...",
      "score": 8,
      "feedback": "Great answer!"
    }
  ],
  "currentQuestionIndex": 1,
  "totalQuestions": 7,
  "isComplete": false,
  "status": "active"
}
```

---

### 4. Stream Response (SSE)

**Endpoint**: `GET /stream/{sessionId}?prompt={prompt}`

**Response**: Server-Sent Events stream

```
data: This is
data: a streaming
data: response from
data: Gemini AI
data: [DONE]
```

**JavaScript Example**:
```javascript
const eventSource = new EventSource(
  `http://localhost:5000/api/interview/stream/${sessionId}?prompt=Tell me more`
);

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close();
    return;
  }
  console.log('Chunk:', event.data);
};
```

---

## Scraper API (Python FastAPI)

**Base URL**: `http://localhost:8000`

### 1. Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "crawler_initialized": true
}
```

---

### 2. Scrape URL

**Endpoint**: `POST /scrape`

**Request Body**:
```json
{
  "url": "https://example.com/job-posting",
  "extract_markdown": true,
  "clean_content": true
}
```

**Response**:
```json
{
  "content": "Job Title: Senior React Developer\n\nRequirements:\n- 5+ years React experience...",
  "title": "Senior React Developer - Example Company",
  "success": true,
  "error": null
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/job-posting",
    "extract_markdown": true,
    "clean_content": true
  }'
```

---

### 3. Simple Scrape

**Endpoint**: `POST /scrape/simple?url={url}`

**Response**:
```json
{
  "content": "Extracted content here..."
}
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request**:
```json
{
  "title": "Invalid Request",
  "detail": "TechStack is required"
}
```

**404 Not Found**:
```json
{
  "title": "Not Found",
  "detail": "Session 65f8a9b2c3d4e5f6g7h8i9j0 not found"
}
```

**500 Internal Server Error**:
```json
{
  "title": "Internal Server Error",
  "detail": "An unexpected error occurred"
}
```

**503 Service Unavailable**:
```json
{
  "title": "Service Unavailable",
  "detail": "Unable to connect to scraper service. Please ensure Crawl4AI is running."
}
```

---

## Rate Limits

- **Gemini API**: Subject to Google's rate limits (check your API key tier)
- **MongoDB**: No rate limits on free tier (but connection limits apply)
- **Scraper**: No built-in rate limits (implement if needed)

---

## Authentication

Currently, the API does not require authentication. For production:

1. Add JWT authentication to ASP.NET Core
2. Implement user registration/login
3. Associate sessions with user IDs
4. Add API key authentication for scraper service

---

## CORS Configuration

**Allowed Origins**:
- `http://localhost:5173` (Frontend dev server)
- `http://localhost:3000` (Alternative frontend port)

**Allowed Methods**: All (GET, POST, PUT, DELETE, etc.)

**Allowed Headers**: All

---

## Testing with Postman

1. Import the following collection:

```json
{
  "info": {
    "name": "Interviewly API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Start Interview",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/interview/start",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"techStack\": \"React, TypeScript\",\n  \"difficulty\": \"medium\",\n  \"resumeText\": \"3 years experience...\"\n}"
        }
      }
    }
  ]
}
```

---

## Swagger Documentation

When the backend is running, access interactive API docs at:

**http://localhost:5000/swagger**

This provides:
- Interactive API testing
- Request/response schemas
- Example values
- Try-it-out functionality

---

**Happy Coding! 🚀**
