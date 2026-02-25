@echo off
echo Starting Refinery Explorer Server...
cd /d "%~dp0"

:: Open the default browser to the local server URL
:: We do this before starting the server so it's ready when the server spins up
echo Opening browser...
start http://localhost:5173

:: Start the Vite development server
echo Starting Vite server...
call npm run dev

pause
