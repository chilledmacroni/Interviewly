using Interviewly.API.Models;
using Interviewly.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Interviewly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExtractionController : ControllerBase
{
    private readonly IExtractionManager _extractionManager;
    private readonly ILogger<ExtractionController> _logger;

    public ExtractionController(IExtractionManager extractionManager, ILogger<ExtractionController> logger)
    {
        _extractionManager = extractionManager;
        _logger = logger;
    }

    [HttpPost("resume")]
    public async Task<ActionResult<ResumeExtractionResult>> ExtractResume(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only PDF files are supported");
        }

        var result = await _extractionManager.ExtractResumeAsync(file);
        
        if (!result.Success)
        {
            return StatusCode(500, result.Error);
        }

        return Ok(result);
    }

    [HttpPost("jd")]
    public async Task<ActionResult<JdExtractionResult>> ExtractJd([FromBody] string url)
    {
        if (string.IsNullOrEmpty(url))
        {
            return BadRequest("URL is required");
        }

        var result = await _extractionManager.ExtractJdAsync(url);

        if (!result.Success)
        {
            return StatusCode(500, result.Error);
        }

        return Ok(result);
    }
}
