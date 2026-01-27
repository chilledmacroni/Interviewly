# Interviewly - Quick Start Guide

Write-Host "🎯 Interviewly Setup Assistant" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check .NET
$dotnetPath = "dotnet"
try {
    $dotnetVersion = & $dotnetPath --version
    Write-Host "✓ .NET SDK: $dotnetVersion" -ForegroundColor Green
}
catch {
    # Try common location
    $manualPath = "C:\Program Files\dotnet\dotnet.exe"
    if (Test-Path $manualPath) {
        $dotnetPath = $manualPath
        $dotnetVersion = & $dotnetPath --version
        Write-Host "✓ .NET SDK: $dotnetVersion (found at $manualPath)" -ForegroundColor Green
    }
    else {
        Write-Host "✗ .NET SDK not found. Please install .NET 8 SDK" -ForegroundColor Red
        exit 1
    }
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Configuration Required" -ForegroundColor Yellow
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Before running, please configure:" -ForegroundColor White
Write-Host "1. backend/Interviewly.API/appsettings.json" -ForegroundColor Cyan
Write-Host "   - Add your Gemini API Key" -ForegroundColor Gray
Write-Host "   - Add your MongoDB connection string`n" -ForegroundColor Gray

$continue = Read-Host "Have you configured appsettings.json? (y/n)"

if ($continue -ne "y") {
    Write-Host "`nPlease configure appsettings.json first, then run this script again." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Starting Services" -ForegroundColor Yellow
Write-Host "================================`n" -ForegroundColor Cyan

# Start Backend
Write-Host "Starting ASP.NET Core Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend\Interviewly.API'; & '$dotnetPath' run"
Start-Sleep -Seconds 2

# Start Scraper
Write-Host "Starting Crawl4AI Scraper Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\scraper'; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; python main.py"
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting React Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Services Starting!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Scraper:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5174 (or 5173)" -ForegroundColor White

Write-Host "`nWait a few seconds for all services to start, then open:" -ForegroundColor Yellow
Write-Host "http://localhost:5174" -ForegroundColor Cyan -NoNewline
Write-Host " in your browser`n" -ForegroundColor Yellow

Write-Host "Press any key to exit this window (services will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
