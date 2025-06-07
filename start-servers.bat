@echo off
echo Starting SAMIA TAROT API and Frontend Servers...
echo.

REM Start Backend API in new window
start "SAMIA TAROT API" cmd /k "cd /d %~dp0 && npm run api"

REM Wait a moment for API to start
timeout /t 3 /nobreak > nul

REM Start Frontend in new window  
start "SAMIA TAROT Frontend" cmd /k "cd /d %~dp0 && npm run frontend"

echo.
echo Backend API: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul 