Write-Host "🔮 Starting SAMIA TAROT Servers..." -ForegroundColor Cyan
Write-Host ""

# Get current directory
$currentDir = Get-Location

# Start Backend API
Write-Host "🚀 Starting Backend API..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; npm run api; Write-Host 'API Running on http://localhost:5000' -ForegroundColor Green"

# Wait for API to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; npm run frontend; Write-Host 'Frontend Running on http://localhost:3000' -ForegroundColor Blue"

Write-Host ""
Write-Host "✅ Both servers are starting..." -ForegroundColor Yellow
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "🔧 Backend API: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host 