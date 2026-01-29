namespace Interviewly.API.Models;

/// <summary>
/// Result of analyzing/diagnosing a resume for structured data extraction
/// </summary>
public class ResumeDiagnosis
{
    public string? Domain { get; set; } // e.g., "Backend Engineering", "Full-Stack Development", "Data Science"
    public string? SeniorityLevel { get; set; } // e.g., "Junior", "Mid-level", "Senior"
    public List<string> CoreSkills { get; set; } = new();
    public List<string> Languages { get; set; } = new();
    public List<string> Technologies { get; set; } = new();
    public List<string> Frameworks { get; set; } = new();
    public string? YearsOfExperience { get; set; }
    public List<string> Industries { get; set; } = new();
    public string? CurrentRole { get; set; }
    public string? EducationLevel { get; set; } // e.g., "Bachelor's", "Master's", "PhD"
    public bool Success { get; set; } = true;
    public string? Error { get; set; }
}
