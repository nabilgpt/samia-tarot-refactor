# smoke_readonly.ps1 - SAMIA-TAROT Read-Only Smoke Tests
# Usage: .\smoke_readonly.ps1 -BaseUrl "https://api.domain.com" -AdminUserId "<uuid>"

param(
    [Parameter(Mandatory=$true)]
    [string]$BaseUrl,
    
    [Parameter(Mandatory=$true)] 
    [string]$AdminUserId,
    
    [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

Write-Host "SAMIA-TAROT Read-Only Smoke Tests" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Admin User: $AdminUserId" -ForegroundColor Gray
Write-Host ""

$PassCount = 0
$FailCount = 0
$Tests = @()

function Test-Endpoint {
    param($Name, $Url, $ExpectedStatus = 200, $Headers = @{})
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSeconds -UseBasicParsing
        $StatusCode = $Response.StatusCode
        
        if ($StatusCode -eq $ExpectedStatus) {
            Write-Host "[PASS] $Name ($StatusCode)" -ForegroundColor Green
            $Script:PassCount++
            return $true
        } else {
            Write-Host "[FAIL] $Name (Expected: $ExpectedStatus, Got: $StatusCode)" -ForegroundColor Red
            $Script:FailCount++
            return $false
        }
    }
    catch {
        $StatusCode = $_.Exception.Response.StatusCode.Value__
        if ($null -eq $StatusCode) { $StatusCode = "ERROR" }
        
        Write-Host "[FAIL] $Name ($StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
        $Script:FailCount++
        return $false
    }
}

# Test 1: Health Check (Admin)
$AdminHeaders = @{
    "X-User-ID" = $AdminUserId
}
$Tests += Test-Endpoint "Health Check" "$BaseUrl/api/ops/health" 200 $AdminHeaders

# Test 2: Countries Metadata
$Tests += Test-Endpoint "Countries List" "$BaseUrl/api/meta/countries?sort=dial_code" 200

# Test 3: Zodiac Signs
$Tests += Test-Endpoint "Zodiac Signs" "$BaseUrl/api/meta/zodiacs" 200

# Test 4: Daily Horoscope (404 acceptable if no content yet)
try {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/horoscopes/daily?zodiac=Leo&country=LB" -TimeoutSec $TimeoutSeconds -UseBasicParsing
    if ($Response.StatusCode -eq 200) {
        Write-Host "[PASS] Daily Horoscope (200 - Content Available)" -ForegroundColor Green
        $PassCount++
    }
}
catch {
    $StatusCode = $_.Exception.Response.StatusCode.Value__
    if ($StatusCode -eq 404) {
        Write-Host "[PASS] Daily Horoscope (404 - No Content Yet, Acceptable)" -ForegroundColor Yellow
        $PassCount++
    } else {
        Write-Host "[FAIL] Daily Horoscope ($StatusCode) - Unexpected Error" -ForegroundColor Red
        $FailCount++
    }
}

# Test 5: System Metrics (Admin)
$Tests += Test-Endpoint "System Metrics" "$BaseUrl/api/ops/metrics?days=1" 200 $AdminHeaders

# Test 6: Database connectivity check via snapshot
$Tests += Test-Endpoint "Database Snapshot" "$BaseUrl/api/ops/snapshot?days=1" 200 $AdminHeaders

Write-Host ""
Write-Host "Test Results Summary:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "PASSED: $PassCount" -ForegroundColor Green
Write-Host "FAILED: $FailCount" -ForegroundColor Red
Write-Host "TOTAL:  $($PassCount + $FailCount)" -ForegroundColor Gray

if ($FailCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 ALL SMOKE TESTS PASSED - SYSTEM READY FOR PRODUCTION" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "❌ $FailCount TEST(S) FAILED - INVESTIGATE BEFORE PROCEEDING" -ForegroundColor Red
    exit 1
}