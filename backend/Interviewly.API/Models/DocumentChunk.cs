using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Interviewly.API.Models;

public class DocumentChunk
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string? UserId { get; set; }
    public string DocId { get; set; } = string.Empty;
    public string DocType { get; set; } = "resume"; // resume | jd
    public int ChunkIndex { get; set; }
    public string Text { get; set; } = string.Empty;
    public List<double> Embedding { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}