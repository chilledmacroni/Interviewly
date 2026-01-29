using Interviewly.API.Models;
using Interviewly.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Interviewly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmbeddingController : ControllerBase
{
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<EmbeddingController> _logger;

    public EmbeddingController(IEmbeddingService embeddingService, ILogger<EmbeddingController> logger)
    {
        _embeddingService = embeddingService;
        _logger = logger;
    }

    [HttpPost("index")]
    public async Task<IActionResult> IndexDocument([FromBody] IndexRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DocId) || string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("docId and text are required");

        await _embeddingService.IndexDocumentAsync(request.UserId, request.DocId, request.DocType ?? "resume", request.Text);
        return Ok(new { success = true });
    }

    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] QueryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query)) return BadRequest("Query is required");
        var results = await _embeddingService.QueryTopKAsync(request.Query, request.K <= 0 ? 5 : request.K, request.UserId);
        return Ok(results);
    }
}

public class IndexRequest
{
    public string? UserId { get; set; }
    public string DocId { get; set; } = string.Empty;
    public string? DocType { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class QueryRequest
{
    public string? UserId { get; set; }
    public string Query { get; set; } = string.Empty;
    public int K { get; set; } = 5;
}