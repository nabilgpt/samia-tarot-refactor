# run_api.ps1 - Windows PowerShell script to start SAMIA-TAROT API
# Usage: .\run_api.ps1

param(
    [string]$Host = "0.0.0.0",
    [int]$Port = 8000,
    [int]$Workers = 2
)

Write-Host "SAMIA-TAROT API Startup Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check if .env file exists and load it
if (Test-Path ".env") {
    Write-Host "Loading environment from .env file..." -ForegroundColor Yellow
    
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]*)\s*=\s*(.*)\s*$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            $value = $value -replace "^'(.*)'$", '$1'
            
            # Set environment variable
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  Set $name" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "Warning: .env file not found. Using system environment variables." -ForegroundColor Yellow
}

# Validate required DB_DSN
$DB_DSN = [System.Environment]::GetEnvironmentVariable("DB_DSN")
if (-not $DB_DSN) {
    Write-Host "ERROR: DB_DSN environment variable is required" -ForegroundColor Red
    Write-Host "Please set DB_DSN in .env file or system environment" -ForegroundColor Red
    exit 1
}

# Check if database is accessible  
Write-Host "Validating database connection..." -ForegroundColor Yellow
try {
    python -c "import psycopg2; psycopg2.connect('$DB_DSN').close(); print('Database connection OK')"
    if ($LASTEXITCODE -ne 0) {
        throw "Database connection failed"
    }
} catch {
    Write-Host "ERROR: Cannot connect to database" -ForegroundColor Red
    Write-Host "Check DB_DSN and network connectivity" -ForegroundColor Red
    exit 1
}

# Check if migrations are up to date
Write-Host "Checking migration status..." -ForegroundColor Yellow
python migrate.py audit | Select-String "Applied migrations:" -A 10

# Start the API server
Write-Host "Starting API server..." -ForegroundColor Green
Write-Host "Host: $Host" -ForegroundColor DarkGray  
Write-Host "Port: $Port" -ForegroundColor DarkGray
Write-Host "Workers: $Workers" -ForegroundColor DarkGray
Write-Host "" 

python -m uvicorn api:app --host $Host --port $Port --workers $Workers