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
    private readonly IScraperService _scraperService;
    private readonly ILogger<InterviewService> _logger;
    private readonly GeminiSettings _geminiSettings;

    // System prompts for different interview stages
    private const string INTERVIEWER_SYSTEM_PROMPT = @"
# ROLE: Agentic Technical Interviewer
You are a senior technical interviewer conducting a mock interview for {techStack} roles at {difficulty} level.

# CORE RESPONSIBILITIES:
1. VALUES ALIGNMENT (CRITICAL):
   - You MUST ask at least 2 questions specifically targeting the extracted 'Company Values' from the Job Description.
   - Do not just ask generic culture fit questions; tie them to the specific values provided (e.g., if 'Ownership' is a value, ask about a time they took ownership of a failing project).
   - If no values are explicitly provided, infer generic high-standard engineering values (Ownership, Curiosity, Impact).

2. TECHNICAL GAP ANALYSIS:
   - Continuously perform a real-time 'Gap Analysis' between the Candidate's Resume and the Job Description.
   - IDENTIFY WEAKNESSES: If the JD requires 'Kubernetes' and the Resume doesn't mention it, YOU MUST DRILL INTO THIS. Use questions like: 'I noticed your resume highlights Docker, but this role requires Kubernetes. Can you explain your experience with K8s orchestration?'
   - VERIFY STRENGTHS: If the resume lists 'Expert Python', test this claim with advanced questions.

# OPERATIONAL LOGIC:
1. QUESTION SEQUENCING:
   - Start with a warm-up or intro based on their background.
   - Then mix Technical Deep Dives (based on Gaps/Requirements) and Values Questions.
   - Ask ONE clear question at a time.
   - Wait for the candidate's answer.

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

# SCORING MODE - Confidence Score (0-10):
Provide a 'Confidence Score' that reflects how confident you are that the candidate truly understands the concept.
Base your score on:
1. Technical Accuracy - Are the facts and concepts correct?
2. Industry Terminology - Do they use proper technical terms?
3. Clarity of Explanation - Can they explain it clearly?
4. Depth of Understanding - Do they show deep vs surface-level knowledge?
5. Practical Application - Do they connect theory to real-world usage?

# EVALUATION CRITERIA:
Return your evaluation in the following JSON format EXACTLY:
{
    ""score"": <number 0-10>,
    ""feedback"": ""<detailed feedback explaining the score>"",
    ""strengths"": [""<specific strength 1>"", ""<specific strength 2>""],
    ""improvements"": [""<specific area to improve 1>"", ""<specific area to improve 2>""]
}

# CONFIDENCE SCORE GUIDELINES:
0-2: Completely incorrect, fundamental misunderstanding, or no relevant answer
3-4: Shows some awareness but significant gaps in understanding or accuracy
5-6: Adequate answer with correct basics but lacks depth or has minor errors
7-8: Good answer with solid understanding, proper terminology, and mostly accurate
9-10: Excellent, comprehensive answer showing deep understanding and practical knowledge

# EVALUATION APPROACH:
- Be fair but demanding - this is a professional technical interview
- Provide specific, actionable feedback
- Identify concrete strengths (not generic praise)
- Suggest specific improvements (not vague advice)
- Consider the difficulty level and tech stack context";

    public InterviewService(
        IOptions<GeminiSettings> geminiSettings,
        IOptions<MongoDbSettings> mongoSettings,
        IScraperService scraperService,
        IHttpClientFactory httpClientFactory,
        ILogger<InterviewService> logger)
    {
        _geminiSettings = geminiSettings.Value;
        _scraperService = scraperService;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
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

        if (string.IsNullOrEmpty(request.ResumeText) && string.IsNullOrEmpty(request.JdUrl) && request.ResumeData == null && request.JdData == null)
        {
            throw new ArgumentException("Either resume (text/data) or JD (url/data) must be provided");
        }

        string? jdContent = null;
        if (request.JdData != null && request.JdData.Success)
        {
            jdContent = request.JdData.Content;
            Console.WriteLine($"[INTERVIEW] Using structured JD data. Values: {request.JdData.CompanyValues?.Count ?? 0}");
        }
        else if (!string.IsNullOrEmpty(request.JdUrl))
        {
            Console.WriteLine($"[INTERVIEW] Scraping JD from URL: {request.JdUrl}");
            try
            {
                // Note: In the new flow, the frontend might access ExtractionController directly. 
                // However, we strictly support legacy string/url flow here for robust service logic.
                jdContent = await _scraperService.ScrapeUrlAsync(request.JdUrl);
                Console.WriteLine($"[INTERVIEW] JD scraped: {jdContent?.Length ?? 0} characters");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[INTERVIEW] ⚠️ Failed to scrape JD URL: {ex.Message}. Continuing with resume only.");
                _logger.LogWarning(ex, "Failed to scrape JD URL, will continue with resume only");
                // Continue without JD - interview can work with just resume
            }
        }
        else if (!string.IsNullOrEmpty(request.JdText))
        {
            jdContent = request.JdText;
            Console.WriteLine($"[INTERVIEW] Using provided JD text: {jdContent.Length} characters");
        }
        
        // Handle Resume Text
        string? resumeText = request.ResumeText;
        if (request.ResumeData != null && request.ResumeData.Success)
        {
             resumeText = request.ResumeData.Text;
             Console.WriteLine($"[INTERVIEW] Using structured Resume data. Skills: {request.ResumeData.Skills?.Count ?? 0}");
        }

        // GUARD CLAUSE: Validate we have meaningful data to work with
        var hasResumeData = !string.IsNullOrWhiteSpace(resumeText) && resumeText.Length > 20;
        var hasJdData = !string.IsNullOrWhiteSpace(jdContent) && jdContent.Length > 20;
        
        if (!hasResumeData && !hasJdData)
        {
            var errorMsg = "Cannot start interview: Both resume and job description are empty or too short. " +
                          $"Resume: {resumeText?.Length ?? 0} chars, JD: {jdContent?.Length ?? 0} chars. " +
                          "Please ensure the PDF is text-based (not scanned) and the URL is accessible.";
            Console.WriteLine($"[INTERVIEW] ❌ {errorMsg}");
            throw new InvalidOperationException(errorMsg);
        }
        
        Console.WriteLine($"[INTERVIEW] ✓ Data validation passed - Resume: {hasResumeData}, JD: {hasJdData}");

        var session = new InterviewSession
        {
            TechStack = request.TechStack,
            Difficulty = request.Difficulty,
            ResumeText = resumeText,
            JdContent = jdContent,
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
        
        var scoreResult = await ScoreAnswerAsync(lastQuestion, request.Answer, session);

        session.Scores.Add(new QuestionScore
        {
            QuestionNumber = session.CurrentQuestionIndex + 1,
            Question = lastQuestion,
            Answer = request.Answer,
            Score = scoreResult.Score,
            Feedback = scoreResult.Feedback
        });

        session.CurrentQuestionIndex++;

        if (session.CurrentQuestionIndex >= session.TotalQuestions)
        {
            session.IsComplete = true;
            session.CompletedAt = DateTime.UtcNow;
            session.Status = "completed";
            
            // Calculate overall score
            var avgScore = session.Scores.Count > 0 ? session.Scores.Average(s => s.Score) : 0;
            session.OverallScore = (int)Math.Round(avgScore);
            
            await UpdateSessionAsync(session);

            var summary = GenerateSummary(session);

            return (new InterviewResponse
            {
                SessionId = session.Id,
                QuestionNumber = session.CurrentQuestionIndex,
                TotalQuestions = session.TotalQuestions,
                IsComplete = true,
                Summary = summary
            }, scoreResult);
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
        var contextBuilder = new StringBuilder();
        contextBuilder.AppendLine($"## Interview Context");
        contextBuilder.AppendLine($"- Tech Stack: {session.TechStack}");
        contextBuilder.AppendLine($"- Difficulty: {session.Difficulty}");
        contextBuilder.AppendLine($"- Question {session.CurrentQuestionIndex + 1} of {session.TotalQuestions}");
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

        contextBuilder.AppendLine("Generate the next interview question. Ensure you follow the 'Values' and 'Gap Analysis' logic defined in your System Prompt. ask only ONE question.");

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

    private async Task<ScoreResult> ScoreAnswerAsync(string question, string answer, InterviewSession session)
    {
        var prompt = new StringBuilder();
        prompt.AppendLine($"## Context");
        prompt.AppendLine($"- Tech Stack: {session.TechStack}");
        prompt.AppendLine($"- Difficulty: {session.Difficulty}");
        prompt.AppendLine($"## Question Asked:");
        prompt.AppendLine(question);
        prompt.AppendLine($"## Candidate's Answer:");
        prompt.AppendLine(answer);
        prompt.AppendLine("Provide your evaluation in the specified JSON format.");

        try
        {
            var responseText = await CallGeminiApiAsync(prompt.ToString(), SCORING_SYSTEM_PROMPT);
            
            var jsonStart = responseText.IndexOf('{');
            var jsonEnd = responseText.LastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var jsonStr = responseText.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var scoreResult = JsonSerializer.Deserialize<ScoreResult>(jsonStr, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                if (scoreResult != null) return scoreResult;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse score response, using default");
        }

        return new ScoreResult
        {
            Score = 5,
            Feedback = "Answer received.",
            Strengths = new List<string> { "Provided a response" },
            Improvements = new List<string> { "Be more specific" }
        };
    }

    private async Task<string> CallGeminiApiAsync(string userPrompt, string systemPrompt)
    {
        // Use gemini-1.5-flash for faster testing and lower latency
        var modelName = "gemini-1.5-flash";
        // The HttpClient already has base address configured, so just use the relative path
        var requestUrl = $"{modelName}:generateContent?key={_geminiSettings.ApiKey}";

        Console.WriteLine($"[GEMINI] Calling {modelName} with {userPrompt.Length} char prompt");
        Console.WriteLine($"[GEMINI DEBUG] API Key starts with: {_geminiSettings.ApiKey.Substring(0, Math.Min(10, _geminiSettings.ApiKey.Length))}...");
        Console.WriteLine($"[GEMINI DEBUG] User prompt preview: {userPrompt.Substring(0, Math.Min(300, userPrompt.Length))}...");

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = userPrompt } }
                }
            },
            systemInstruction = new
            {
                role = "user",
                parts = new[] { new { text = systemPrompt } }
            }
        };

        Console.WriteLine($"[GEMINI] Sending request to: {requestUrl}");
        
        var response = await _httpClient.PostAsJsonAsync(requestUrl, requestBody);
        
        Console.WriteLine($"[GEMINI] Response status: {response.StatusCode}");
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"[GEMINI] ❌ API error: {response.StatusCode}");
            Console.WriteLine($"[GEMINI] Full error response: {errorContent}");
            _logger.LogError("Gemini API error: {Status} {Error}", response.StatusCode, errorContent);
            return "";
        }

        try
        {
            var responseJson = await response.Content.ReadFromJsonAsync<JsonElement>();
            
            Console.WriteLine($"[GEMINI] Response received, parsing...");
            
            // Check if there are candidates in the response
            if (!responseJson.TryGetProperty("candidates", out var candidatesProperty))
            {
                Console.WriteLine($"[GEMINI] ❌ No candidates in response");
                return "";
            }
            
            Console.WriteLine($"[GEMINI] Candidates array length: {candidatesProperty.GetArrayLength()}");
            
            if (candidatesProperty.GetArrayLength() == 0)
            {
                Console.WriteLine($"[GEMINI] ❌ Empty candidates array");
                return "";
            }
            
            // Traverse: candidates[0].content.parts[0].text
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
                
            return text ?? "";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GEMINI] ❌ Failed to parse response: {ex.Message}");
            Console.WriteLine($"[GEMINI] ❌ Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[GEMINI] ❌ Stack trace: {ex.StackTrace}");
            _logger.LogError(ex, "Failed to parse Gemini response");
            return "";
        }
    }

    private InterviewSummary GenerateSummary(InterviewSession session)
    {
        var avgScore = session.Scores.Count > 0 ? session.Scores.Average(s => s.Score) : 0;
        var overallFeedback = avgScore switch
        {
            >= 8 => "Excellent performance! You demonstrated strong technical knowledge.",
            >= 6 => "Good performance with solid understanding.",
            >= 4 => "Adequate performance. Review the feedback and practice more.",
            _ => "Consider spending more time studying the fundamentals."
        };

        return new InterviewSummary
        {
            OverallScore = Math.Round(avgScore, 1),
            QuestionsAnswered = session.Scores.Count,
            QuestionScores = session.Scores,
            OverallFeedback = overallFeedback
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

    private static int GetQuestionCount(string difficulty) => difficulty.ToLower() switch
    {
        "easy" => 5,
        "medium" => 7,
        "hard" => 10,
        _ => 5
    };

    private static string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength) return text;
        return text[..maxLength] + "...";
    }
}
