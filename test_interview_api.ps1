# Test the interview API directly
$sampleResume = @"
Anuska Parmar
Senior Software Engineer

SKILLS:
- Languages: C#, Python, JavaScript, Java
- Frameworks: .NET, ASP.NET Core, React
- Databases: SQL Server, MongoDB, PostgreSQL
- Cloud: AWS, Azure
- Tools: Git, Docker, Kubernetes

EXPERIENCE:
Senior Developer at TechCorp (2021-Present)
- Led development of microservices architecture
- Mentored junior developers
- Reduced API response time by 40%

Software Engineer at StartupXyz (2019-2021)
- Full-stack development
- Built real-time notification system
- Implemented CI/CD pipeline
"@

$body = @{
    techStack = "C# / .NET"
    difficulty = "medium"
    resumeText = $sampleResume
    jdText = "We are looking for a Senior .NET Developer with 5+ years experience in ASP.NET Core, microservices, and cloud technologies."
} | ConvertTo-Json

Write-Host "Testing Interview API..." -ForegroundColor Cyan
Write-Host "Sending request to http://localhost:5000/api/interview/start"
Write-Host "Payload:" -ForegroundColor Yellow
Write-Host $body

$response = Invoke-WebRequest `
    -Uri "http://localhost:5000/api/interview/start" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

Write-Host "`nResponse Status: $($response.StatusCode)" -ForegroundColor Green
$content = $response.Content | ConvertFrom-Json
Write-Host "Question Generated:" -ForegroundColor Yellow
Write-Host $content.question
Write-Host "`nFull Response:" -ForegroundColor Yellow
Write-Host ($content | ConvertTo-Json)
