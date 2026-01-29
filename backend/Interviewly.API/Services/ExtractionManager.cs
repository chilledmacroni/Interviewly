using System.Text.Json;
using Interviewly.API.Configuration;
using Interviewly.API.Models;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using System.IO;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace Interviewly.API.Services;

public interface IExtractionManager
{
    Task<ResumeExtractionResult> ExtractResumeAsync(IFormFile file);
}

public class ExtractionManager : IExtractionManager
{
    private readonly HttpClient _httpClient;
    private readonly Crawl4AISettings _settings;
    private readonly ILogger<ExtractionManager> _logger;

    public ExtractionManager(
        HttpClient httpClient,
        IOptions<Crawl4AISettings> settings,
        ILogger<ExtractionManager> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<ResumeExtractionResult> ExtractResumeAsync(IFormFile file)
    {
        try
        {
            Console.WriteLine($"[EXTRACTION] Starting resume extraction for: {file.FileName}");
            _logger.LogInformation("Extracting resume: {FileName}", file.FileName);

            var fileName = file.FileName.ToLower();
            byte[] content;
            using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                content = ms.ToArray();
            }

            var extractedText = "";

            if (fileName.EndsWith(".pdf"))
            {
                extractedText = ExtractTextFromPdf(content);
            }
            else if (fileName.EndsWith(".docx"))
            {
                extractedText = ExtractTextFromDocx(content);
            }
            else
            {
                return new ResumeExtractionResult { Success = false, Error = "Unsupported file format. Only PDF and DOCX are supported." };
            }

            if (string.IsNullOrWhiteSpace(extractedText) || extractedText.Length < 20)
            {
                Console.WriteLine("[EXTRACTION] ❌ Extracted text is empty or too short");
                return new ResumeExtractionResult { Success = false, Error = "File appears to be empty or contains no extractable text." };
            }

            Console.WriteLine($"[EXTRACTION] ✓ Resume extracted successfully: {extractedText.Length} characters");
            
            // Basic heuristic to find skills
            var skills = ExtractSkills(extractedText);
            
            return new ResumeExtractionResult
            {
                Text = extractedText,
                Success = true,
                Skills = skills,
                Projects = new List<string>()
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EXTRACTION] ❌ Exception: {ex.Message}");
            _logger.LogError(ex, "Error extracting resume");
            return new ResumeExtractionResult { Success = false, Error = ex.Message };
        }
    }

    private string ExtractTextFromPdf(byte[] pdfContent)
    {
        try
        {
            // Use iTextSharp to extract PDF text
            using var reader = new iText.Kernel.Pdf.PdfReader(new MemoryStream(pdfContent));
            using var pdfDoc = new iText.Kernel.Pdf.PdfDocument(reader);
            var text = new System.Text.StringBuilder();

            for (int i = 1; i <= pdfDoc.GetNumberOfPages(); i++)
            {
                var page = pdfDoc.GetPage(i);
                text.Append(iText.Kernel.Pdf.Canvas.Parser.PdfTextExtractor.GetTextFromPage(page));
                text.Append("\n");
            }

            return text.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PDF extraction failed");
            return "";
        }
    }

    private string ExtractTextFromDocx(byte[] docxContent)
    {
        try
        {
            using var ms = new MemoryStream(docxContent);
            using var doc = DocumentFormat.OpenXml.Packaging.WordprocessingDocument.Open(ms, false);
            var body = doc.MainDocumentPart?.Document.Body;
            
            if (body == null) return "";

            var text = new System.Text.StringBuilder();
            foreach (var para in body.Descendants<DocumentFormat.OpenXml.Wordprocessing.Paragraph>())
            {
                var paraText = string.Concat(para.Descendants<DocumentFormat.OpenXml.Wordprocessing.Text>().Select(t => t.Text));
                if (!string.IsNullOrWhiteSpace(paraText))
                {
                    text.AppendLine(paraText);
                }
            }

            return text.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DOCX extraction failed");
            return "";
        }
    }

    private List<string> ExtractSkills(string resumeText)
    {
        var skills = new List<string>();
        var lowerText = resumeText.ToLower();
        
        // Look for "Skills" section
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
                    inSkillsSection = false;
                    break;
                }

                // Split by comma or semicolon
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
