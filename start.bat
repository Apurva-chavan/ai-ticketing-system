@echo off
echo.
echo  AI Ticketing System - Windows Setup
echo  ============================================================

REM Set your API key here if not already set in environment
IF "%ANTHROPIC_API_KEY%"=="" (
    SET /P ANTHROPIC_API_KEY="Enter your Anthropic API key: "
)

echo.
echo  Installing backend dependencies...
cd backend
pip install -r requirements.txt
echo  Backend dependencies installed!

echo.
echo  Starting backend server...
start "AI Ticketing Backend" cmd /k "set ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% && python main.py"

timeout /t 3 /nobreak > NUL

echo.
echo  Installing and starting frontend...
cd ..\frontend
call npm install
start "AI Ticketing Frontend" cmd /k "npm start"

echo.
echo  ============================================================
echo   App launching...
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo  ============================================================
echo.
pause
