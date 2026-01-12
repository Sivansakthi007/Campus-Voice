@echo off
echo Testing Complaint Submission Fix
echo ================================
echo.

echo Step 1: Checking if backend dependencies are installed...
cd backend
python -c "import fastapi, sqlalchemy, uvicorn; print('✅ Dependencies OK')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Dependencies missing. Run: pip install -r requirements.txt
    pause
    exit /b 1
)
echo.

echo Step 2: Starting backend server...
echo (Server will start in background. Close this window to stop it)
start /b python server.py
timeout /t 3 /nobreak >nul
echo.

echo Step 3: Running manual API tests...
cd ..
python manual_test.py

echo.
echo If tests pass, complaints are now being saved to database!
echo Check MySQL: SELECT * FROM complaints;
pause
