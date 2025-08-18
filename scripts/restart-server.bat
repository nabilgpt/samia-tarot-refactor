@echo off
REM SAMIA TAROT - Phase 5 Windows Server Restart Script
REM This script ensures proper kill-and-restart flow on Windows

echo 🔧 SAMIA TAROT Server Restart (Windows)
echo ==========================================

set REASON=%1
set USER=%2

if "%REASON%"=="" set REASON=Manual restart
if "%USER%"=="" set USER=%USERNAME%

echo 📋 Reason: %REASON%
echo 👤 User: %USER%
echo ==========================================

REM Change to project root
cd /d "%~dp0\.."

REM Run the server manager
node scripts/server-manager.js restart "%REASON%" "%USER%"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Server restart completed successfully
    exit /b 0
) else (
    echo ❌ Server restart failed
    exit /b 1
) 