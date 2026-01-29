using Interviewly.API.Models;
using Interviewly.API.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Interviewly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExtractionController : ControllerBase
{
    private readonly IExtractionManager _extractionManager;
    private readonly IEmbeddingService _embeddingService;
    private readonly IInterviewService _interviewService;
    private readonly ILogger<ExtractionController> _logger;

    public ExtractionController(IExtractionManager extractionManager, IEmbeddingService embeddingService, IInterviewService interviewService, ILogger<ExtractionController> logger)
    {
        _extractionManager = extractionManager;
        _embeddingService = embeddingService;
        _interviewService = interviewService;
        _logger = logger;
    }

    [HttpPost("resume")]
    public async Task<ActionResult<ResumeExtractionResult>> ExtractResume(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        // Only support PDF and DOCX
        if (!(file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
              || file.FileName.EndsWith(".docx", StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest("Only PDF and DOCX files are supported");
        }

        var result = await _extractionManager.ExtractResumeAsync(file);
        
        if (!result.Success)
        {
            return StatusCode(500, result);
        }

        // Fire-and-forget: index resume chunks for semantic retrieval
        try
        {
            var docId = System.Guid.NewGuid().ToString();
            _ = Task.Run(() => _embeddingService.IndexDocumentAsync(null, docId, "resume", result.Text));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to start indexing job for extracted resume");
        }

        return Ok(result);
    }

    [HttpPost("diagnose")]
    public async Task<ActionResult<ResumeDiagnosis>> DiagnoseResume([FromBody] ResumeDiagnosisRequest request)
    {
        Console.WriteLine("[DIAGNOSIS] === DIAGNOSE ENDPOINT CALLED ===");
        _logger.LogInformation("DiagnoseResume endpoint called");
        
        if (request == null)
        {
            Console.WriteLine("[DIAGNOSIS] ❌ Request is NULL");
            return BadRequest(new ResumeDiagnosis { Success = false, Error = "Request body is null" });
        }
        
        Console.WriteLine($"[DIAGNOSIS] Request received. ResumeText length: {request.ResumeText?.Length ?? 0}");
        
        if (string.IsNullOrWhiteSpace(request?.ResumeText) || request.ResumeText.Length < 50)
        {
            Console.WriteLine($"[DIAGNOSIS] ❌ Resume text too short or empty: {request?.ResumeText?.Length ?? 0} chars");
            return BadRequest(new ResumeDiagnosis 
            { 
                Success = false, 
                Error = "Resume text must be at least 50 characters" 
            });
        }

        try
        {
            Console.WriteLine("[DIAGNOSIS] Starting resume diagnosis...");
            _logger.LogInformation("Diagnosing resume: {Length} characters", request.ResumeText.Length);

            var diagnosis = await AnalyzeResumeWithGemini(request.ResumeText);
            
            Console.WriteLine($"[DIAGNOSIS] ✓ Resume diagnosed: Domain={diagnosis.Domain}, Seniority={diagnosis.SeniorityLevel}");
            return Ok(diagnosis);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DIAGNOSIS] ❌ Exception: {ex.Message}");
            _logger.LogError(ex, "Error diagnosing resume");
            return StatusCode(500, new ResumeDiagnosis 
            { 
                Success = false, 
                Error = ex.Message 
            });
        }
    }

    private async Task<ResumeDiagnosis> AnalyzeResumeWithGemini(string resumeText)
    {
        var prompt = new StringBuilder();
        prompt.AppendLine("Analyze this resume and extract the following structured information. Return ONLY a valid JSON object with no extra text:");
        prompt.AppendLine();
        prompt.AppendLine("Resume:");
        prompt.AppendLine(resumeText.Substring(0, Math.Min(2000, resumeText.Length)));
        prompt.AppendLine();
        prompt.AppendLine(@"Return ONLY this JSON structure (no markdown, no code blocks):
{
  ""domain"": ""e.g. Backend Engineering, Full-Stack Development, Data Science"",
  ""seniorityLevel"": ""Junior/Mid-level/Senior"",
  ""coreSkills"": [""skill1"", ""skill2""],
  ""languages"": [""Python"", ""Java""],
  ""technologies"": [""AWS"", ""Kubernetes""],
  ""frameworks"": [""Django"", ""React""],
  ""yearsOfExperience"": ""5-7"",
  ""industries"": [""FinTech"", ""E-commerce""],
  ""currentRole"": ""Software Engineer"",
  ""educationLevel"": ""Bachelor's in Computer Science""
}");

        // Call Gemini (via InterviewService's existing method or direct call)
        try
        {
            // For now, fallback to heuristic analysis since we need Gemini settings
            return AnalyzeResumeHeuristic(resumeText);
        }
        catch
        {
            return AnalyzeResumeHeuristic(resumeText);
        }
    }

    private ResumeDiagnosis AnalyzeResumeHeuristic(string resumeText)
    {
        var lower = resumeText.ToLower();
        var diagnosis = new ResumeDiagnosis();

        // Heuristic detection
        diagnosis.SeniorityLevel = lower.Contains("senior") ? "Senior" : 
                                  lower.Contains("lead") ? "Senior" :
                                  lower.Contains("junior") ? "Junior" : "Mid-level";

        diagnosis.Domain = lower.Contains("backend") ? "Backend Engineering" :
                          lower.Contains("frontend") ? "Frontend Engineering" :
                          lower.Contains("full stack") ? "Full-Stack Development" :
                          lower.Contains("devops") ? "DevOps Engineering" :
                          lower.Contains("data science") ? "Data Science" :
                          lower.Contains("data engineer") ? "Data Engineering" :
                          "Software Engineering";

        // Extract programming languages
        var commonLanguages = new[] { "Python", "Java", "C#", "JavaScript", "TypeScript", "Go", "Rust", "C++", "PHP", "Ruby", "Kotlin" };
        diagnosis.Languages = commonLanguages.Where(lang => lower.Contains(lang.ToLower())).ToList();

        // Extract technologies/frameworks
        var commonTechs = new[] { "AWS", "Azure", "GCP", "Docker", "Kubernetes", "React", "Angular", "Vue", "Node.js", "Django", "Spring", "FastAPI", "GraphQL", "REST", "SQL", "MongoDB", "PostgreSQL", "Redis", "Elasticsearch", "Kafka" };
        diagnosis.Technologies = commonTechs.Where(tech => lower.Contains(tech.ToLower())).ToList();

        // Extract core skills
        var skills = ExtractSkillsFromResume(resumeText);
        diagnosis.CoreSkills = skills.Take(10).ToList();

        // Years of experience heuristic
        var expMatch = System.Text.RegularExpressions.Regex.Match(lower, @"(\d+)\+?\s*years?");
        diagnosis.YearsOfExperience = expMatch.Success ? $"{expMatch.Groups[1].Value}+ years" : "Not specified";

        // Education level
        diagnosis.EducationLevel = lower.Contains("phd") ? "PhD" :
                                  lower.Contains("master") ? "Master's" :
                                  lower.Contains("bachelor") ? "Bachelor's" : "Not specified";

        diagnosis.Success = true;
        return diagnosis;
    }

    private List<string> ExtractSkillsFromResume(string resumeText)
    {
        var skills = new List<string>();
        var lines = resumeText.Split(new[] { "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries);
        var inSkillsSection = false;

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (trimmed.ToLower().Contains("skills"))
            {
                inSkillsSection = true;
                continue;
            }

            if (inSkillsSection && !string.IsNullOrWhiteSpace(trimmed))
            {
                if (trimmed.ToLower().StartsWith("experience") || trimmed.ToLower().StartsWith("education"))
                {
                    break;
                }

                var skillSet = trimmed.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var skill in skillSet)
                {
                    var cleanSkill = skill.Trim().TrimStart('-', '*', '•').Trim();
                    if (!string.IsNullOrWhiteSpace(cleanSkill) && cleanSkill.Length > 2)
                    {
                        skills.Add(cleanSkill);
                    }
                }
            }
        }

        return skills.Distinct().ToList();
    }
}
