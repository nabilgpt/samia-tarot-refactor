@echo off
REM ============================================================================
REM SAMIA TAROT - Backend Auto-Startup Script for Windows
REM This script automatically starts the backend server with PM2
REM Place this file in Windows Startup folder for automatic boot startup
REM ============================================================================

echo Starting SAMIA TAROT Backend...
echo.

REM Change to project directory
cd /d "C:\Users\saeee\OneDrive\Documents\project\samia-tarot"

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed globally
    echo Please run: npm install -g pm2
    pause
    exit /b 1
)

REM Try to resurrect saved PM2 processes first
echo Attempting to resurrect saved PM2 processes...
pm2 resurrect

REM Check if samia-backend process is running
pm2 describe samia-backend >nul 2>nul
if %errorlevel% neq 0 (
    echo Backend not found in PM2, starting fresh...
    pm2 start ecosystem.config.cjs
) else (
    echo Backend process found, checking status...
    pm2 status
)

REM Final status check
echo.
echo ============================================================================
echo SAMIA TAROT Backend Startup Complete
echo ============================================================================
pm2 status
echo.
echo Backend should be running on: http://localhost:5001
echo View logs with: pm2 logs samia-backend
echo.

REM Keep window open for a few seconds to see results
timeout /t 5 /nobreak >nul

exit /b 0 