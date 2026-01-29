using Interviewly.API.Configuration;
using Interviewly.API.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Interviewly.API.Services;

public interface IEmbeddingService
{
    Task IndexDocumentAsync(string? userId, string docId, string docType, string text);
    Task<List<DocumentChunk>> QueryTopKAsync(string query, int k = 5, string? userId = null);
}

public class EmbeddingService : IEmbeddingService
{
    private readonly IMongoCollection<DocumentChunk> _chunks;
    private readonly HttpClient _httpClient;
    private readonly GeminiSettings _geminiSettings;
    private readonly ILogger<EmbeddingService> _logger;

    public EmbeddingService(IOptions<MongoDbSettings> mongoSettings,
        IOptions<GeminiSettings> geminiSettings,
        IHttpClientFactory httpClientFactory,
        ILogger<EmbeddingService> logger)
    {
        var mongoClient = new MongoClient(mongoSettings.Value.ConnectionString);
        var database = mongoClient.GetDatabase(mongoSettings.Value.DatabaseName);
        _chunks = database.GetCollection<DocumentChunk>("document_chunks");
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _geminiSettings = geminiSettings.Value;
        _logger = logger;
    }

    public async Task IndexDocumentAsync(string? userId, string docId, string docType, string text)
    {
        // Chunk by characters for simplicity (can be improved by tokenization)
        var chunkSize = 1000; // approx characters
        var overlap = 200;
        var chunks = new List<DocumentChunk>();
        var idx = 0;
        for (int start = 0; start < text.Length; start += (chunkSize - overlap))
        {
            var len = Math.Min(chunkSize, text.Length - start);
            var chunkText = text.Substring(start, len);
            var chunk = new DocumentChunk
            {
                UserId = userId,
                DocId = docId,
                DocType = docType,
                ChunkIndex = idx++,
                Text = chunkText
            };

            // Generate embedding (try Gemini, fallback deterministic)
            chunk.Embedding = await GenerateEmbeddingAsync(chunkText);

            chunks.Add(chunk);
        }

        if (chunks.Count > 0)
        {
            await _chunks.InsertManyAsync(chunks);
            _logger.LogInformation("Indexed {Count} chunks for doc {DocId}", chunks.Count, docId);
        }
    }

    public async Task<List<DocumentChunk>> QueryTopKAsync(string query, int k = 5, string? userId = null)
    {
        var queryEmbedding = await GenerateEmbeddingAsync(query);

        // Fetch candidate chunks (filter by userId if provided), simple approach: retrieve all and compute similarity
        var filter = userId != null ? Builders<DocumentChunk>.Filter.Eq(c => c.UserId, userId) : Builders<DocumentChunk>.Filter.Empty;
        var candidates = await _chunks.Find(filter).ToListAsync();

        var scored = candidates.Select(c => new { Chunk = c, Score = CosineSimilarity(queryEmbedding, c.Embedding) })
            .OrderByDescending(x => x.Score)
            .Take(k)
            .Select(x => x.Chunk)
            .ToList();

        return scored;
    }

    private async Task<List<double>> GenerateEmbeddingAsync(string text)
    {
        // Attempt to call Gemini embedding endpoint (best-effort, tolerant parser)
        try
        {
            var modelName = !string.IsNullOrEmpty(_geminiSettings.EmbeddingModelName) ? _geminiSettings.EmbeddingModelName : _geminiSettings.ModelName; // prefer explicit embedding model if set
            var requestUrl = $"https://generativelanguage.googleapis.com/v1/models/{modelName}:embedText?key={_geminiSettings.ApiKey}";

            var payload = new { input = text };
            var response = await _httpClient.PostAsJsonAsync(requestUrl, payload);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                // Try to find the first array of numbers in the response
                var numbers = FindFirstNumericArray(doc.RootElement);
                if (numbers != null && numbers.Length > 0)
                {
                    return numbers.ToList();
                }

                _logger.LogWarning("Gemini embedding response did not contain an array of numbers. Falling back.");
            }
            else
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini embedding request failed: {Status} {Err}", response.StatusCode, err);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini embedding call failed, using fallback embedding");
        }

        // Fallback deterministic embedding from SHA256
        return FallbackEmbedding(text, 128);
    }

    private double[]? FindFirstNumericArray(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            // Check if array contains numbers
            if (element.EnumerateArray().All(e => e.ValueKind == JsonValueKind.Number))
            {
                return element.EnumerateArray().Select(e => e.GetDouble()).ToArray();
            }
        }

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                var found = FindFirstNumericArray(prop.Value);
                if (found != null) return found;
            }
        }

        return null;
    }

    private static List<double> FallbackEmbedding(string text, int dim)
    {
        // Create deterministic vector by hashing text repeatedly
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(text));
        var v = new List<double>(dim);
        int i = 0;
        while (v.Count < dim)
        {
            // Expand hash with extra hashing
            var next = SHA256.HashData(hash.Concat(BitConverter.GetBytes(i)).ToArray());
            for (int j = 0; j < next.Length && v.Count < dim; j += 8)
            {
                var slice = next.Skip(j).Take(8).ToArray();
                if (slice.Length < 8) break;
                var val = BitConverter.ToDouble(slice, 0);
                // Normalize into -1..1
                v.Add(Math.Tanh(val));
            }
            i++;
        }

        // Normalize vector
        var norm = Math.Sqrt(v.Sum(x => x * x));
        if (norm > 0)
        {
            for (int idx = 0; idx < v.Count; idx++) v[idx] /= norm;
        }

        return v;
    }

    private static double CosineSimilarity(IReadOnlyList<double> a, IReadOnlyList<double> b)
    {
        if (a == null || b == null || a.Count == 0 || b.Count == 0) return 0;
        var len = Math.Min(a.Count, b.Count);
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < len; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) return 0;
        return dot / (Math.Sqrt(na) * Math.Sqrt(nb));
    }
}
