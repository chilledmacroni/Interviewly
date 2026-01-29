# MongoDB Cleanup Script
# This will connect to your MongoDB and delete all interview results for testing

Write-Host "MongoDB Cleanup Script" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Load MongoDB connection string from appsettings.json
$appsettings = Get-Content "appsettings.json" | ConvertFrom-Json
$connectionString = $appsettings.MongoDbSettings.ConnectionString
$databaseName = $appsettings.MongoDbSettings.DatabaseName

Write-Host "Database: $databaseName" -ForegroundColor Yellow
Write-Host ""
Write-Host "This will DELETE ALL interview results from the database." -ForegroundColor Red
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Green
    exit
}

Write-Host ""
Write-Host "To clean up, use MongoDB Compass or mongosh:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open MongoDB Compass and connect to:" -ForegroundColor White
Write-Host "   $connectionString" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Navigate to database: $databaseName" -ForegroundColor White
Write-Host ""
Write-Host "3. Go to collection: interview_results" -ForegroundColor White
Write-Host ""
Write-Host "4. Delete all documents or select specific ones to delete" -ForegroundColor White
Write-Host ""
Write-Host "Alternatively, use mongosh command:" -ForegroundColor Cyan
Write-Host "   db.interview_results.deleteMany({})" -ForegroundColor Gray
Write-Host ""
