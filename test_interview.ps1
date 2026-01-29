# Test Gemini Interview Generation

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Gemini Interview" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Start an interview session
Write-Host "[TEST] Starting Interview Session..." -ForegroundColor Yellow
$startBody = @{
    techStack = ".NET"
    difficulty = "medium"
    resumeText = "John Doe Senior Software Engineer with 5+ years of experience in .NET, C#, microservices architecture, Docker, Kubernetes, MongoDB, and REST APIs. Built distributed systems and led backend development teams."
} | ConvertTo-Json

Write-Host "Request body:" -ForegroundColor Gray
Write-Host $startBody -ForegroundColor Gray
Write-Host ""

$startResponse = curl.exe -X POST -H "Content-Type: application/json" -d $startBody http://localhost:5000/api/interview/start -s

Write-Host "[RESPONSE] Interview Started:" -ForegroundColor Green
$startResponse | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Check Backend Logs for:" -ForegroundColor Cyan
Write-Host "  [GEMINI] Calling model..." -ForegroundColor Yellow
Write-Host "  [GEMINI] Response received..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
