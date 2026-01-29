# Interview Flow Testing

## Expected Flow

### 1. Start Interview (POST /api/interview/start)
**Request:**
```json
{
  "techStack": ".NET",
  "difficulty": "medium",
  "resumeText": "John Doe Senior Software Engineer with 5+ years..."
}
```

**Response:**
```json
{
  "sessionId": "abc123",
  "question": "Can you tell me about your experience with .NET?",
  "questionNumber": 1,
  "totalQuestions": 5,
  "isComplete": false
}
```

**✅ AI ASKS FIRST - User should see this question immediately**

---

### 2. Submit Answer (POST /api/interview/answer)
**Request:**
```json
{
  "sessionId": "abc123",
  "answer": "I have 5+ years with .NET, building microservices..."
}
```

**Response:**
```json
{
  "interviewResponse": {
    "sessionId": "abc123",
    "question": "How do you handle dependency injection in .NET?",
    "questionNumber": 2,
    "totalQuestions": 5,
    "isComplete": false
  },
  "score": {
    "score": 85,
    "feedback": "Good answer covering microservices",
    "improvements": ["Could mention specific frameworks", "Add more technical depth"]
  }
}
```

**✅ Score is for Question 1, New question is Question 2**

---

## Current Issue

User reports:
> "AI should ask first but right now, it definitely maps something wrong as after I have to type first it asks a question (that is static fallback) and with the static questions it (idk how, scores the previous answer (that question that it didn't ask))"

### Hypothesis
- Frontend might not be showing the first question from `startInterview` response
- OR Backend is not generating a real question (using fallback)
- OR There's a mismatch in question/answer pairing

---

## Test Steps

1. **Start Frontend** - `npm run dev` in frontend folder
2. **Upload resume and start interview**
3. **Check:**
   - Does AI ask first question immediately? (without user typing)
   - Is the first question relevant (not a static fallback)?
   - After user answers Q1, does scoring make sense?
   - Is Q2 generated properly?

---

## Code References

### Backend - StartInterviewAsync (InterviewService.cs:114)
```csharp
var firstQuestion = await GenerateQuestionAsync(session);
session.Conversation.Add(new ConversationTurn
{
    Role = "interviewer",
    Content: firstQuestion
});
return new InterviewResponse
{
    SessionId = session.Id,
    Question = firstQuestion,  // ✅ Returns first question
    QuestionNumber = 1,
    TotalQuestions = session.TotalQuestions,
    IsComplete = false
};
```

### Frontend - initSession (InterviewSession.tsx:33)
```typescript
const response = await startInterview({
    techStack: config.techStack,
    difficulty: config.difficulty,
    resumeText: config.resumeText
});

const question = response.question || "I'm ready to start the interview. Let's begin!";
setMessages([
    {
        id: 'system-1',
        role: 'system',
        content: `Interview initialized for ${config.techStack} (${config.difficulty})`,
        timestamp: new Date()
    },
    {
        id: '1',
        role: 'interviewer',
        content: question,  // ✅ Displays first question
        timestamp: new Date()
    }
]);
```

### Backend - SubmitAnswerAsync (InterviewService.cs:180)
```csharp
var lastQuestion = session.Conversation
    .LastOrDefault(c => c.Role == "interviewer")?.Content ?? "";

var scoreResult = await ScoreAnswerAsync(lastQuestion, request.Answer, session);  // ✅ Scores against last interviewer question

var nextQuestion = await GenerateQuestionAsync(session);
```

---

## Next Steps

1. Run frontend and backend together
2. Test interview flow end-to-end
3. Check browser console for any errors
4. Verify first question is displayed before user types anything
