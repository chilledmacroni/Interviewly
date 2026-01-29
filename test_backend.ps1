# Test Script for Consolidated .NET Backend
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Consolidated Backend" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[TEST 1] Health Check..." -ForegroundColor Yellow
$health = curl.exe -s http://localhost:5000/health
Write-Host "Response: $health" -ForegroundColor Green
Write-Host ""

# Test 2: Extract Resume (DOCX)
Write-Host "[TEST 2] Extracting Resume from DOCX..." -ForegroundColor Yellow
$extractResponse = curl.exe -X POST -F "file=@c:\Users\Dell\Interviewly\scraper\sample_resume.docx" http://localhost:5000/api/extraction/resume -s
Write-Host "Response:" -ForegroundColor Green
$extractResponse | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# Test 3: Diagnose Resume
Write-Host "[TEST 3] Diagnosing Resume..." -ForegroundColor Yellow
$resumeText = "John Doe Senior Software Engineer Experienced backend engineer with 5+ years building distributed services in .NET and Python. Skilled in system design, microservices, and databases. Education: Bachelor's in Computer Science. Skills: Python, C#, .NET, MongoDB, Docker, Kubernetes, REST, CI/CD"
$bodyFile = "diagnose_body.json"
@{
    resumeText = $resumeText
} | ConvertTo-Json | Out-File -FilePath $bodyFile -Encoding utf8

$diagnoseResponse = curl.exe -X POST -H "Content-Type: application/json" --data-binary "@$bodyFile" http://localhost:5000/api/extraction/diagnose -s
Write-Host "Response:" -ForegroundColor Green
$diagnoseResponse
Remove-Item $bodyFile -ErrorAction SilentlyContinue
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "All Tests Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
