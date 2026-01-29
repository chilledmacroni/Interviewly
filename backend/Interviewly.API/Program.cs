using Interviewly.API.Configuration;
using Interviewly.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Interviewly API",
        Version = "v1",
        Description = "AI-powered mock interview assistant API"
    });
});

// Configure settings
builder.Services.Configure<GeminiSettings>(
    builder.Configuration.GetSection(GeminiSettings.SectionName));
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection(MongoDbSettings.SectionName));
builder.Services.Configure<Crawl4AISettings>(
    builder.Configuration.GetSection(Crawl4AISettings.SectionName));
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

// Configure Authentication
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>();
if (jwtSettings == null) 
{
    throw new InvalidOperationException("JwtSettings are not configured properly in appsettings.json");
}
var key = System.Text.Encoding.ASCII.GetBytes(jwtSettings.Secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // For dev
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience
    };
});

// Register HttpClient for Gemini
builder.Services.AddHttpClient("GeminiClient", client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/models/");
    client.Timeout = TimeSpan.FromSeconds(60);
});

builder.Services.AddHttpClient<IExtractionManager, ExtractionManager>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(120); // Longer timeout for extraction
});

// Note: URL scraping removed (no Crawl4AI service). Resume extraction still uses extraction manager calling the local resume extraction endpoint.

// Register HttpClientFactory for services
builder.Services.AddHttpClient();

// Register services
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
// Voice analysis service
builder.Services.AddScoped<VoiceAnalysisService>();
// Text-to-speech service
builder.Services.AddScoped<ITTSService, TTSService>();
// Embedding service for document chunking and semantic retrieval
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
// Interview history service for MongoDB persistence
builder.Services.AddSingleton(sp => 
{
    var appSettings = new AppSettings();
    builder.Configuration.Bind(appSettings);
    return new InterviewHistoryService(appSettings);
});

// Configure CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Interviewly API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
