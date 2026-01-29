using Interviewly.API.Configuration;
using Interviewly.API.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Interviewly.API.Services;

public interface IInterviewService
{
    Task<InterviewResponse> StartInterviewAsync(StartInterviewRequest request, string? userId = null);
    Task<(InterviewResponse Response, ScoreResult Score)> SubmitAnswerAsync(SubmitAnswerRequest request);
    Task<InterviewSession?> GetSessionAsync(string sessionId);
    Task<List<InterviewSession>> GetHistoryAsync(string userId);
    IAsyncEnumerable<string> StreamResponseAsync(string sessionId, string prompt);
}

public class InterviewService : IInterviewService
{
    private readonly HttpClient _httpClient;
    private readonly IMongoCollection<InterviewSession> _sessions;
    private readonly ILogger<InterviewService> _logger;
    private readonly GeminiSettings _geminiSettings;
    private static DateTime _lastGeminiCallTime = DateTime.MinValue;
    private static readonly SemaphoreSlim _geminiRateLimitLock = new SemaphoreSlim(1, 1);

    // System prompts for different interview stages
    private const string INTERVIEWER_SYSTEM_PROMPT = @"
# ROLE: Agentic Technical Interviewer
You are a senior technical interviewer conducting a structured 6-question mock interview.

# INTERVIEW STRUCTURE (STRICTLY FOLLOW):
This interview has EXACTLY 6 questions distributed as:
- Questions 1-3: TECHNICAL questions (coding, system design, technical depth)
- Questions 4-5: BEHAVIORAL questions (past experiences, teamwork, conflict resolution)
- Question 6: SITUATIONAL question (hypothetical scenario, problem-solving)

# DIFFICULTY ADAPTATION:
- EASY: Basic concepts, simple scenarios, foundational knowledge
- MEDIUM: Real-world applications, moderate complexity, some edge cases
- HARD: Advanced concepts, complex scenarios, deep technical knowledge, architectural decisions

Adjust question complexity based on the difficulty level, but ALWAYS maintain the 3-2-1 structure.

# CORE RESPONSIBILITIES:
1. TECHNICAL GAP ANALYSIS (Questions 1-3):
   - Analyze the gap between the candidate's Resume and Job Description requirements
   - If JD requires 'Kubernetes' but Resume only mentions 'Docker', ask about K8s experience
   - Test claimed expertise (if Resume says 'Expert Python', ask advanced Python questions)
   - Focus on tech stack relevance

2. BEHAVIORAL ASSESSMENT (Questions 4-5):
   - Ask about past experiences using STAR format (Situation, Task, Action, Result)
   - Target company values if provided in JD (Ownership, Collaboration, Innovation, etc.)
   - Examples: 'Tell me about a time you took ownership of a failing project' or 'Describe a conflict with a team member'
   - **RESUME-AWARE**: Reference specific projects or experiences mentioned in their resume (e.g., 'You mentioned leading a team of X engineers - tell me about a time...')

3. SITUATIONAL JUDGMENT (Question 6):
   - Present a realistic work scenario relevant to the role
   - Assess problem-solving, decision-making, and priorities
   - Example: 'Your production system is down, and you have a critical deadline. How do you handle it?'
   - **RESUME-AWARE**: Tie scenarios to their experience level and domain (e.g., for someone with distributed systems experience, ask about microservice failures)

# OPERATIONAL LOGIC:
1. QUESTION SEQUENCING:
   - **ALWAYS REFERENCE RESUME**: Use specific details from the candidate's resume (projects, companies, years, technologies)
   - Example: Instead of 'Tell me about your Docker experience', say: 'Your resume mentions 5+ years with Docker containerization. Can you describe how you designed a container orchestration strategy for one of your production systems?'
   - Ask ONE clear, focused question at a time
   - Track which question number you're on (1-6)
   - Ensure you're asking the right TYPE for the current question number

2. INTERVIEW STYLE:
   - Professional but encouraging.
   - Adaptive: if they fail a question, lower the difficulty slightly or pivot. If they ace it, go deeper.
   - Context-Aware: Reference their specific projects/experience in your questions.

3. QUESTION QUALITY:
   - Real-world scenarios over textbook definitions.
   - 'Tell me about a time...' for values.
   - 'How would you design/debug...' for technical.

Always maintain a professional, encouraging tone.";

    private const string SCORING_SYSTEM_PROMPT = @"
# ROLE: Expert Technical Evaluator
You are evaluating a candidate's answer in a technical interview.

# SCORING CRITERIA (Each 0-10):
1. **Confidence Score** - How confident are you the candidate truly understands this concept?
2. **Technical Accuracy** - Are the facts, concepts, and technical details correct?
3. **Clarity** - How clear and well-structured is their explanation?
4. **Depth** - Surface-level knowledge vs deep understanding?

# REQUIRED OUTPUT FORMAT (STRICT JSON):
You MUST return EXACTLY this JSON structure with NO additional text:
```json
{
    ""score"": <number 0-10, overall score>,
    ""confidenceScore"": <number 0-10>,
    ""technicalAccuracy"": <number 0-10>,
    ""clarity"": <number 0-10>,
    ""depth"": <number 0-10>,
    ""feedback"": ""<2-3 sentences summarizing the evaluation>"",
    ""strengths"": [""<strength 1>"", ""<strength 2>""],
    ""improvements"": [""<specific actionable tip 1>"", ""<specific actionable tip 2>"", ""<specific actionable tip 3>""],
    ""insights"": [""<key insight about their answer 1>"", ""<key insight about their answer 2>""]
}
```

# GUIDELINES:
- **improvements**: Must be EXACTLY 3 specific, actionable tips to improve their answer
- **insights**: Must be EXACTLY 2 observations about what their answer reveals (e.g., ""Shows practical experience with X"", ""Lacks understanding of Y pattern"")
- **strengths**: List 1-3 positive aspects of the answer
- Be fair but demanding - this is a professional technical interview
- Use the difficulty level as context for expectations

# SCORE RANGES:
- 0-2: Completely incorrect or irrelevant answer
- 3-4: Significant gaps or misunderstandings
- 5-6: Adequate but lacks depth or has errors
- 7-8: Good answer with solid understanding
- 9-10: Excellent, comprehensive, shows mastery

Return ONLY the JSON, no other text.";

    public InterviewService(
        IOptions<GeminiSettings> geminiSettings,
        IOptions<MongoDbSettings> mongoSettings,
        IHttpClientFactory httpClientFactory,
        ILogger<InterviewService> logger)
    {
        _geminiSettings = geminiSettings.Value;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _httpClient.Timeout = TimeSpan.FromSeconds(60); // Increase timeout for Gemini
        _logger = logger;

        // Initialize MongoDB
        var mongoClient = new MongoClient(mongoSettings.Value.ConnectionString);
        var database = mongoClient.GetDatabase(mongoSettings.Value.DatabaseName);
        _sessions = database.GetCollection<InterviewSession>("interview_sessions");
    }

    public async Task<InterviewResponse> StartInterviewAsync(StartInterviewRequest request, string? userId = null)
    {
        Console.WriteLine($"[INTERVIEW] Starting new interview session for tech stack: {request.TechStack}");
        _logger.LogInformation("Starting new interview session for tech stack: {TechStack}", request.TechStack);

        // Require a resume (text or extracted data)
        if (string.IsNullOrEmpty(request.ResumeText) && request.ResumeData == null)
        {
            throw new ArgumentException("A resume (text or uploaded file) must be provided");
        }

        // Handle Resume Text
        string? resumeText = request.ResumeText;
        if (request.ResumeData != null && request.ResumeData.Success)
        {
             resumeText = request.ResumeData.Text;
             Console.WriteLine($"[INTERVIEW] Using structured Resume data. Skills: {request.ResumeData.Skills?.Count ?? 0}");
        }

        // Validate resume content
        var hasResumeData = !string.IsNullOrWhiteSpace(resumeText) && resumeText.Length > 20;
        
        if (!hasResumeData)
        {
            var errorMsg = "Cannot start interview: Resume is empty or too short. " +
                          $"Resume: {resumeText?.Length ?? 0} chars. " +
                          "Please ensure the PDF or DOCX is text-based (not scanned).";
            Console.WriteLine($"[INTERVIEW] ❌ {errorMsg}");
            throw new InvalidOperationException(errorMsg);
        }
        
        Console.WriteLine($"[INTERVIEW] ✓ Data validation passed - Resume: {hasResumeData}");

        var session = new InterviewSession
        {
            TechStack = request.TechStack,
            Difficulty = request.Difficulty,
            ResumeText = resumeText,
            ResumeData = request.ResumeData,
            JdData = request.JdData,
            TotalQuestions = GetQuestionCount(request.Difficulty),
            UserId = userId
        };

        Console.WriteLine($"[INTERVIEW] Generating first question...");
        var firstQuestion = await GenerateQuestionAsync(session);
        Console.WriteLine($"[INTERVIEW] ✓ First question generated: {firstQuestion.Substring(0, Math.Min(100, firstQuestion.Length))}...");

        session.Conversation.Add(new ConversationTurn
        {
            Role = "interviewer",
            Content = firstQuestion
        });

        await _sessions.InsertOneAsync(session);

        return new InterviewResponse
        {
            SessionId = session.Id,
            Question = firstQuestion,
            QuestionNumber = 1,
            TotalQuestions = session.TotalQuestions,
            IsComplete = false
        };
    }

    public async Task<(InterviewResponse Response, ScoreResult Score)> SubmitAnswerAsync(SubmitAnswerRequest request)
    {
        var session = await GetSessionAsync(request.SessionId);
        if (session == null) throw new KeyNotFoundException($"Session not found: {request.SessionId}");
        if (session.IsComplete) throw new InvalidOperationException("Interview session is already complete");

        session.Conversation.Add(new ConversationTurn
        {
            Role = "candidate",
            Content = request.Answer
        });

        var lastQuestion = session.Conversation
            .LastOrDefault(c => c.Role == "interviewer")?.Content ?? "";
        
        // Pass voice analysis to scoring for Gemini to consider
        var scoreResult = await ScoreAnswerAsync(lastQuestion, request.Answer, session, request.VoiceAnalysis);

        // Integrate voice confidence if provided
        int finalScore = scoreResult.Score;
        int? voiceConfidenceScore = null;
        
        if (request.VoiceConfidence.HasValue)
        {
            // Convert voice confidence from 0-100 to 0-10 scale
            voiceConfidenceScore = (int)Math.Round(request.VoiceConfidence.Value / 10.0);
            
            // Combined score: 70% content + 30% voice
            finalScore = (int)Math.Round((scoreResult.Score * 0.7) + (voiceConfidenceScore.Value * 0.3));
            
            Console.WriteLine($"[SCORING] Content: {scoreResult.Score}/10, Voice: {voiceConfidenceScore}/10, Combined: {finalScore}/10");
        }

        var questionNumber = session.CurrentQuestionIndex + 1;
        var questionType = GetQuestionType(questionNumber);
        
        // Extract voice delivery metrics if available
        VoiceDeliveryMetrics? voiceDelivery = null;
        if (request.VoiceAnalysis?.Analysis != null)
        {
            voiceDelivery = new VoiceDeliveryMetrics
            {
                FillerWordsCount = request.VoiceAnalysis.Analysis.FillerWords?.Count ?? 0,
                FillerWordsPercentage = request.VoiceAnalysis.Analysis.FillerWords?.Percentage ?? 0,
                SpeechPaceWPM = request.VoiceAnalysis.Analysis.SpeechPace?.WordsPerMinute ?? 0,
                PaceRating = request.VoiceAnalysis.Analysis.SpeechPace?.PaceRating ?? "unknown",
                ToneScore = request.VoiceAnalysis.Analysis.Sentiment?.Compound ?? 0,
                VocalEnergy = request.VoiceAnalysis.Analysis.VoiceQuality?.EnergyLevel ?? 0,
                Clarity = request.VoiceAnalysis.Analysis.VoiceQuality?.ClarityScore ?? 0
            };
        }
        
        session.Scores.Add(new QuestionScore
        {
            QuestionNumber = questionNumber,
            Category = questionType,
            Question = lastQuestion,
            Answer = request.Answer,
            Score = finalScore, // Use combined score if voice provided, otherwise content score
            ConfidenceScore = scoreResult.ConfidenceScore,
            TechnicalAccuracy = scoreResult.TechnicalAccuracy,
            Clarity = scoreResult.Clarity,
            Depth = scoreResult.Depth,
            Feedback = scoreResult.Feedback,
            Strengths = scoreResult.Strengths ?? new List<string>(),
            Improvements = scoreResult.Improvements,
            Insights = scoreResult.Insights,
            VoiceConfidence = request.VoiceConfidence,
            VoiceDelivery = voiceDelivery
        });

        session.CurrentQuestionIndex++;

        if (session.CurrentQuestionIndex >= session.TotalQuestions)
        {
            try
            {
                Console.WriteLine($"[INTERVIEW] 🎯 Interview complete! Generating summary...");
                session.IsComplete = true;
                session.CompletedAt = DateTime.UtcNow;
                session.Status = "completed";
                
                // Calculate overall score
                var avgScore = session.Scores.Count > 0 ? session.Scores.Average(s => s.Score) : 0;
                session.OverallScore = (int)Math.Round(avgScore);
                Console.WriteLine($"[INTERVIEW] ✓ Overall score calculated: {session.OverallScore}");
                
                Console.WriteLine($"[INTERVIEW] Updating session in database...");
                await UpdateSessionAsync(session);
                Console.WriteLine($"[INTERVIEW] ✓ Session updated");

                Console.WriteLine($"[INTERVIEW] Generating interview summary...");
                var summary = GenerateSummary(session);
                Console.WriteLine($"[INTERVIEW] ✓ Summary generated successfully");
                Console.WriteLine($"[INTERVIEW] Summary - Score: {summary.OverallScore}, Confidence: {summary.AverageConfidence}, Questions: {summary.QuestionsAnswered}");

                return (new InterviewResponse
                {
                    SessionId = session.Id,
                    QuestionNumber = session.CurrentQuestionIndex,
                    TotalQuestions = session.TotalQuestions,
                    IsComplete = true,
                    Summary = summary
                }, scoreResult);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[INTERVIEW] ❌ ERROR during completion: {ex.Message}");
                Console.WriteLine($"[INTERVIEW] ❌ Stack trace: {ex.StackTrace}");
                _logger.LogError(ex, "Failed to complete interview");
                throw;
            }
        }

        var nextQuestion = await GenerateQuestionAsync(session);
        session.Conversation.Add(new ConversationTurn
        {
            Role = "interviewer",
            Content = nextQuestion
        });

        await UpdateSessionAsync(session);

        return (new InterviewResponse
        {
            SessionId = session.Id,
            Question = nextQuestion,
            QuestionNumber = session.CurrentQuestionIndex + 1,
            TotalQuestions = session.TotalQuestions,
            IsComplete = false
        }, scoreResult);
    }

    public async Task<InterviewSession?> GetSessionAsync(string sessionId)
    {
        return await _sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
    }
    
    public async Task<List<InterviewSession>> GetHistoryAsync(string userId)
    {
        return await _sessions.Find(s => s.UserId == userId)
            .SortByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(string sessionId, string prompt)
    {
        var session = await GetSessionAsync(sessionId);
        if (session == null)
        {
            yield return "Error: Session not found";
            yield break;
        }

        var fullPrompt = BuildPrompt(session, prompt);
        var responseText = await CallGeminiApiAsync(fullPrompt, INTERVIEWER_SYSTEM_PROMPT);
        
        if (!string.IsNullOrEmpty(responseText))
        {
            yield return responseText;
        }
    }

    private async Task<string> GenerateQuestionAsync(InterviewSession session)
    {
        var questionNumber = session.CurrentQuestionIndex + 1;
        var questionType = GetQuestionType(questionNumber);
        
        var contextBuilder = new StringBuilder();
        contextBuilder.AppendLine($"## Interview Context");
        contextBuilder.AppendLine($"- Tech Stack: {session.TechStack}");
        contextBuilder.AppendLine($"- Difficulty: {session.Difficulty}");
        contextBuilder.AppendLine($"- Current Question: {questionNumber} of {session.TotalQuestions}");
        contextBuilder.AppendLine($"- Question Type: {questionType}");
        contextBuilder.AppendLine();

        if (!string.IsNullOrEmpty(session.ResumeText))
        {
            contextBuilder.AppendLine("## Candidate Resume:");
            contextBuilder.AppendLine(TruncateText(session.ResumeText, 3000)); // Increased limit
            contextBuilder.AppendLine();
        }

        if (session.JdData != null && session.JdData.Success)
        {
            contextBuilder.AppendLine("## Structured Job Requirements (Values & Skills):");
            if (session.JdData.CompanyValues?.Any() == true)
                contextBuilder.AppendLine($"- Company Values: {string.Join(", ", session.JdData.CompanyValues)}");
            if (session.JdData.RequiredSkills?.Any() == true)
                contextBuilder.AppendLine($"- Required Skills: {string.Join(", ", session.JdData.RequiredSkills)}");
            if (session.JdData.Responsibilities?.Any() == true)
                contextBuilder.AppendLine($"- Responsibilities: {string.Join(", ", session.JdData.Responsibilities)}");
            contextBuilder.AppendLine();
        }

        if (!string.IsNullOrEmpty(session.JdContent))
        {
            contextBuilder.AppendLine("## Full Job Description Text:");
            contextBuilder.AppendLine(TruncateText(session.JdContent, 3000)); // Increased limit
            contextBuilder.AppendLine();
        }

        if (session.Conversation.Count > 0)
        {
            contextBuilder.AppendLine("## Previous Conversation:");
            foreach (var turn in session.Conversation.TakeLast(6))
            {
                var role = turn.Role == "interviewer" ? "Interviewer" : "Candidate";
                contextBuilder.AppendLine($"{role}: {TruncateText(turn.Content, 500)}");
            }
            contextBuilder.AppendLine();
        }

        contextBuilder.AppendLine($"## Instruction:");
        contextBuilder.AppendLine($"You are now asking Question {questionNumber} which must be a {questionType} question.");
        contextBuilder.AppendLine($"Follow the interview structure defined in your system prompt.");
        contextBuilder.AppendLine($"Generate ONE clear, focused {questionType} question appropriate for {session.Difficulty} difficulty.");
        contextBuilder.AppendLine($"Adapt the question complexity to the difficulty level while maintaining the {questionType} format.");

        var question = await CallGeminiApiAsync(contextBuilder.ToString(), INTERVIEWER_SYSTEM_PROMPT);
        
        // Fallback if Gemini returns empty or error
        if (string.IsNullOrWhiteSpace(question))
        {
            Console.WriteLine("[INTERVIEW] ⚠️ Gemini returned empty response, using fallback question");
            question = GenerateFallbackQuestion(session);
        }
        
        return question;
    }

    private string GenerateFallbackQuestion(InterviewSession session)
    {
        var difficulty = session.Difficulty.ToLower();
        var questionIndex = session.CurrentQuestionIndex + 1;
        
        var fallbackQuestions = new Dictionary<string, List<string>>
        {
            ["easy"] = new()
            {
                $"What is your experience with {session.TechStack}?",
                "Can you describe a project where you used these technologies?",
                "What attracted you to this role?",
                "How do you stay updated with new technologies?",
                "Tell me about your teamwork experience."
            },
            ["medium"] = new()
            {
                $"Walk me through how you would architect a solution using {session.TechStack}.",
                "Describe a challenging technical problem you solved and your approach.",
                "How would you handle performance optimization in this tech stack?",
                "Tell me about a time you had to refactor code. What was your strategy?",
                "How do you approach testing and quality assurance?",
                "Describe your experience with system design.",
                "How have you contributed to code reviews in your team?"
            },
            ["hard"] = new()
            {
                $"Design a scalable system architecture using {session.TechStack} for 1 million concurrent users.",
                "How would you handle distributed transactions in a microservices environment?",
                "Describe your approach to debugging a critical production issue.",
                "How would you optimize a complex database query under heavy load?",
                "Discuss your experience with cloud architecture and deployment strategies.",
                "How do you approach technical debt management in large codebases?",
                "Tell me about your experience with containerization and orchestration.",
                "How would you design fault-tolerant systems?",
                "Describe your approach to API design and versioning.",
                "How do you handle performance bottlenecks in high-traffic applications?"
            }
        };

        var questions = fallbackQuestions.ContainsKey(difficulty) 
            ? fallbackQuestions[difficulty] 
            : fallbackQuestions["medium"];
        
        var question = questions[Math.Min(questionIndex - 1, questions.Count - 1)];
        Console.WriteLine($"[INTERVIEW] Using fallback question {questionIndex}: {question}");
        return question;
    }

    private async Task<ScoreResult> ScoreAnswerAsync(string question, string answer, InterviewSession session, VoiceAnalysisData? voiceAnalysis = null)
    {
        var prompt = new StringBuilder();
        prompt.AppendLine($"## Context");
        prompt.AppendLine($"- Tech Stack: {session.TechStack}");
        prompt.AppendLine($"- Difficulty: {session.Difficulty}");
        
        // Add voice delivery metrics if available
        if (voiceAnalysis?.Analysis != null)
        {
            prompt.AppendLine();
            prompt.AppendLine($"## Voice Delivery Analysis (CRITICAL - MUST IMPACT SCORING):");
            
            if (voiceAnalysis.Analysis.FillerWords != null)
            {
                prompt.AppendLine($"- Filler Words: {voiceAnalysis.Analysis.FillerWords.Count} detected ({voiceAnalysis.Analysis.FillerWords.Percentage:F1}%)");
                if (voiceAnalysis.Analysis.FillerWords.Found?.Count > 0)
                {
                    var topFillers = string.Join(", ", voiceAnalysis.Analysis.FillerWords.Found.Take(3).Select(f => $"{f.Key} ({f.Value}x)"));
                    prompt.AppendLine($"  Most Common: {topFillers}");
                }
                prompt.AppendLine($"  **IMPACT**: {'>'} 10% = Major confidence penalty | 5-10% = Moderate penalty | <5% = Professional");
            }
            
            if (voiceAnalysis.Analysis.SpeechPace != null)
            {
                prompt.AppendLine($"- Speech Pace: {voiceAnalysis.Analysis.SpeechPace.WordsPerMinute:F0} WPM ({voiceAnalysis.Analysis.SpeechPace.PaceRating})");
                prompt.AppendLine($"  **IMPACT**: Too slow (<100 WPM) = Lacks confidence | Too fast (>200 WPM) = Nervous/unclear | Normal (100-180) = Confident");
            }
            
            if (voiceAnalysis.Analysis.Sentiment != null)
            {
                prompt.AppendLine($"- Tone & Confidence:");
                prompt.AppendLine($"  Positive: {voiceAnalysis.Analysis.Sentiment.Positive:F2} | Neutral: {voiceAnalysis.Analysis.Sentiment.Neutral:F2} | Negative: {voiceAnalysis.Analysis.Sentiment.Negative:F2}");
                prompt.AppendLine($"  Overall Tone Score: {voiceAnalysis.Analysis.Sentiment.Compound:F2} (-1 to +1)");
                prompt.AppendLine($"  **IMPACT**: Compound <-0.3 = Lacks confidence/hesitant | -0.3 to 0.3 = Neutral | >0.3 = Confident & positive");
            }
            
            if (voiceAnalysis.Analysis.VoiceQuality != null)
            {
                prompt.AppendLine($"- Voice Quality:");
                prompt.AppendLine($"  Pitch Variation: {voiceAnalysis.Analysis.VoiceQuality.PitchVariation:F1} Hz (monotone vs expressive)");
                prompt.AppendLine($"  Energy Level: {voiceAnalysis.Analysis.VoiceQuality.EnergyLevel:F1}/10 (vocal projection)");
                prompt.AppendLine($"  Clarity: {voiceAnalysis.Analysis.VoiceQuality.ClarityScore:F1}/10 (articulation quality)");
                prompt.AppendLine($"  **IMPACT**: Low energy (<4) = Disengaged | Low clarity (<4) = Poor communication | Good metrics (>6) = Professional");
            }
            
            prompt.AppendLine();
            prompt.AppendLine($"**SCORING INSTRUCTION**: These delivery metrics MUST affect your evaluation:");
            prompt.AppendLine($"- Even if technically correct, low confidence/poor delivery should reduce scores by 2-4 points");
            prompt.AppendLine($"- Excessive filler words indicate lack of preparation or knowledge - reduce clarity & confidence scores");
            prompt.AppendLine($"- Negative/hesitant tone suggests uncertainty about the answer - reduce confidence & depth scores");
            prompt.AppendLine($"- Poor voice quality (low energy, clarity) = weak communication skills - reduce clarity score");
            prompt.AppendLine($"- Strong delivery with weak content = moderate score (5-6/10)");
            prompt.AppendLine($"- Strong content with poor delivery = reduced score (6-7/10)");
            prompt.AppendLine($"- Strong content + strong delivery = high score (8-10/10)");
            prompt.AppendLine();
        }
        
        prompt.AppendLine($"## Question Asked:");
        prompt.AppendLine(question);
        prompt.AppendLine($"## Candidate's Answer:");
        prompt.AppendLine(answer);
        prompt.AppendLine("Provide your evaluation in the specified JSON format.");

        try
        {
            Console.WriteLine("[SCORING] Calling Gemini for answer evaluation...");
            var responseText = await CallGeminiApiAsync(prompt.ToString(), SCORING_SYSTEM_PROMPT);
            
            if (string.IsNullOrWhiteSpace(responseText))
            {
                Console.WriteLine("[SCORING] ⚠️ Gemini returned empty response for scoring");
                throw new Exception("Empty response from Gemini");
            }
            
            Console.WriteLine($"[SCORING] Raw response length: {responseText.Length} chars");
            
            var jsonStart = responseText.IndexOf('{');
            var jsonEnd = responseText.LastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var jsonStr = responseText.Substring(jsonStart, jsonEnd - jsonStart + 1);
                Console.WriteLine($"[SCORING] Extracted JSON: {jsonStr.Substring(0, Math.Min(200, jsonStr.Length))}...");
                
                var scoreResult = JsonSerializer.Deserialize<ScoreResult>(jsonStr, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                if (scoreResult != null)
                {
                    Console.WriteLine($"[SCORING] ✓ Parsed score: {scoreResult.Score}/10, Confidence: {scoreResult.ConfidenceScore}/10");
                    return scoreResult;
                }
            }
            
            Console.WriteLine("[SCORING] ⚠️ Failed to extract JSON from response");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SCORING] ❌ Exception: {ex.Message}");
            _logger.LogWarning(ex, "Failed to parse score response, using default");
        }

        Console.WriteLine("[SCORING] Using fallback score");
        return new ScoreResult
        {
            Score = 5,
            ConfidenceScore = 5,
            TechnicalAccuracy = 5,
            Clarity = 5,
            Depth = 5,
            Feedback = "Answer received. Unable to evaluate properly.",
            Strengths = new List<string> { "Provided a response" },
            Improvements = new List<string> { "Be more specific", "Add more technical details", "Provide concrete examples" },
            Insights = new List<string> { "Response was too brief for detailed evaluation", "Unable to assess depth of understanding" }
        };
    }

    private async Task<string> CallGeminiApiAsync(string userPrompt, string systemPrompt)
    {
        // Rate limiting: Wait if needed before making the call
        await _geminiRateLimitLock.WaitAsync();
        try
        {
            var timeSinceLastCall = DateTime.UtcNow - _lastGeminiCallTime;
            var minimumDelay = TimeSpan.FromSeconds(15);
            
            if (timeSinceLastCall < minimumDelay)
            {
                var waitTime = minimumDelay - timeSinceLastCall;
                Console.WriteLine($"[GEMINI] ⏳ Rate limit: waiting {waitTime.TotalSeconds:F1}s since last call...");
                await Task.Delay(waitTime);
                Console.WriteLine("[GEMINI] ✓ Rate limit delay complete");
            }
        }
        finally
        {
            _geminiRateLimitLock.Release();
        }

        // Use configured model (fallback to gemini-1.5-flash)
        var modelName = !string.IsNullOrEmpty(_geminiSettings.ModelName) ? _geminiSettings.ModelName : "gemini-1.5-flash";
        var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={_geminiSettings.ApiKey}";

        Console.WriteLine($"[GEMINI] Calling model {modelName} with {userPrompt.Length} char prompt");
        var masked = !string.IsNullOrEmpty(_geminiSettings.ApiKey) && _geminiSettings.ApiKey.Length > 4
            ? "***" + _geminiSettings.ApiKey.Substring(_geminiSettings.ApiKey.Length - 4)
            : "***";
        Console.WriteLine($"[GEMINI] API Key masked: {masked}");
        Console.WriteLine($"[GEMINI DEBUG] User prompt preview: {userPrompt.Substring(0, Math.Min(300, userPrompt.Length))}...");

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new { text = systemPrompt + "\n\n" + userPrompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 2048,
                topP = 0.95,
                topK = 40
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        Console.WriteLine($"[GEMINI] Sending request to: {requestUrl}");

        var response = await _httpClient.PostAsync(requestUrl, content);

        Console.WriteLine($"[GEMINI] Response status: {response.StatusCode}");

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"[GEMINI] ❌ API error: {response.StatusCode}");
            Console.WriteLine($"[GEMINI] Full error response: {errorContent}");
            _logger.LogError("Gemini API error: {Status} {Error}", response.StatusCode, errorContent);
            return string.Empty;
        }

        try
        {
            var responseJson = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

            if (!responseJson.TryGetProperty("candidates", out var candidatesProperty))
            {
                Console.WriteLine("[GEMINI] ❌ No candidates in response");
                return string.Empty;
            }

            if (candidatesProperty.GetArrayLength() == 0)
            {
                Console.WriteLine("[GEMINI] ❌ Empty candidates array");
                return string.Empty;
            }

            var text = responseJson
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            Console.WriteLine($"[GEMINI] ✓ Response received: {text?.Length ?? 0} characters");
            if (!string.IsNullOrEmpty(text))
            {
                Console.WriteLine($"[GEMINI DEBUG] Response preview: {text.Substring(0, Math.Min(200, text.Length))}...");
            }

            // Update last call time (no delay here - delay happens at START of next call)
            _lastGeminiCallTime = DateTime.UtcNow;

            return text ?? string.Empty;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GEMINI] ❌ Failed to parse response: {ex.Message}");
            Console.WriteLine($"[GEMINI] ❌ Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[GEMINI] ❌ Stack trace: {ex.StackTrace}");
            _logger.LogError(ex, "Failed to parse Gemini response");
            return string.Empty;
        }
    }

    private InterviewSummary GenerateSummary(InterviewSession session)
    {
        var avgScore = session.Scores.Count > 0 ? session.Scores.Average(s => s.Score) : 0;
        var avgConfidence = session.Scores.Count > 0 ? session.Scores.Average(s => s.ConfidenceScore) : 0;
        
        // Calculate voice delivery averages (only from voice answers)
        var voiceAnswers = session.Scores.Where(s => s.VoiceDelivery != null).ToList();
        double? avgVoiceConfidence = null;
        double? avgFillerPercentage = null;
        double? avgSpeechPace = null;
        double? avgToneScore = null;
        double? avgVocalEnergy = null;
        
        if (voiceAnswers.Any())
        {
            avgVoiceConfidence = voiceAnswers.Where(s => s.VoiceConfidence.HasValue)
                .Average(s => s.VoiceConfidence!.Value);
            avgFillerPercentage = voiceAnswers.Average(s => s.VoiceDelivery!.FillerWordsPercentage);
            avgSpeechPace = voiceAnswers.Average(s => s.VoiceDelivery!.SpeechPaceWPM);
            avgToneScore = voiceAnswers.Average(s => s.VoiceDelivery!.ToneScore);
            avgVocalEnergy = voiceAnswers.Average(s => s.VoiceDelivery!.VocalEnergy);
        }
        
        // Calculate averages by question type
        var technicalScores = session.Scores.Where(s => s.QuestionNumber >= 1 && s.QuestionNumber <= 3).ToList();
        var behavioralScores = session.Scores.Where(s => s.QuestionNumber >= 4 && s.QuestionNumber <= 5).ToList();
        var situationalScore = session.Scores.FirstOrDefault(s => s.QuestionNumber == 6);
        
        var technicalAvg = technicalScores.Any() ? technicalScores.Average(s => s.Score) : 0;
        var behavioralAvg = behavioralScores.Any() ? behavioralScores.Average(s => s.Score) : 0;
        var situationalScr = situationalScore?.Score ?? 0;
        
        // Collect top strengths and weaknesses
        var allImprovements = session.Scores.SelectMany(s => s.Improvements).Distinct().Take(5).ToList();
        var strengthsMap = new Dictionary<string, int>();
        
        foreach (var score in session.Scores)
        {
            if (score.Score >= 7)
            {
                if (score.QuestionNumber <= 3) strengthsMap["Strong technical knowledge"] = strengthsMap.GetValueOrDefault("Strong technical knowledge") + 1;
                if (score.QuestionNumber >= 4 && score.QuestionNumber <= 5) strengthsMap["Good behavioral responses"] = strengthsMap.GetValueOrDefault("Good behavioral responses") + 1;
                if (score.Clarity >= 7) strengthsMap["Clear communication"] = strengthsMap.GetValueOrDefault("Clear communication") + 1;
            }
        }
        
        var topStrengths = strengthsMap.OrderByDescending(kv => kv.Value).Take(3).Select(kv => kv.Key).ToList();
        
        var overallFeedback = avgScore switch
        {
            >= 8 => "Excellent performance! You demonstrated strong technical knowledge and communication skills.",
            >= 6 => "Good performance with solid understanding. Focus on the improvement areas to reach the next level.",
            >= 4 => "Adequate performance. Review the feedback and practice more to strengthen your skills.",
            _ => "Consider spending more time studying the fundamentals and practicing interview questions."
        };

        return new InterviewSummary
        {
            OverallScore = Math.Round(avgScore, 1),
            AverageConfidence = Math.Round(avgConfidence, 1),
            TechnicalAverage = Math.Round(technicalAvg, 1),
            BehavioralAverage = Math.Round(behavioralAvg, 1),
            SituationalScore = situationalScr,
            QuestionsAnswered = session.Scores.Count,
            QuestionScores = session.Scores,
            TopStrengths = topStrengths,
            KeyWeaknesses = allImprovements,
            OverallFeedback = overallFeedback,
            // Voice delivery metrics
            AverageVoiceConfidence = avgVoiceConfidence.HasValue ? Math.Round(avgVoiceConfidence.Value, 1) : null,
            AverageFillerPercentage = avgFillerPercentage.HasValue ? Math.Round(avgFillerPercentage.Value, 1) : null,
            AverageSpeechPace = avgSpeechPace.HasValue ? Math.Round(avgSpeechPace.Value, 1) : null,
            AverageToneScore = avgToneScore.HasValue ? Math.Round(avgToneScore.Value, 2) : null,
            AverageVocalEnergy = avgVocalEnergy.HasValue ? Math.Round(avgVocalEnergy.Value, 1) : null,
            VoiceAnswersCount = voiceAnswers.Count
        };
    }

    private async Task UpdateSessionAsync(InterviewSession session)
    {
        await _sessions.ReplaceOneAsync(s => s.Id == session.Id, session);
    }

    private string BuildPrompt(InterviewSession session, string userPrompt)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Tech Stack: {session.TechStack}, Difficulty: {session.Difficulty}");
        sb.AppendLine("User request: " + userPrompt);
        return sb.ToString();
    }

    private static int GetQuestionCount(string difficulty) => 6;

    private static string GetQuestionType(int questionNumber) => questionNumber switch
    {
        1 or 2 or 3 => "TECHNICAL",
        4 or 5 => "BEHAVIORAL",
        6 => "SITUATIONAL",
        _ => "TECHNICAL"
    };

    private static string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength) return text;
        return text[..maxLength] + "...";
    }
}
