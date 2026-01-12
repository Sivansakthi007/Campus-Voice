# PowerShell script to test the complaint submission fix
Write-Host "🧪 Testing Complaint Submission Fix" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Step 1: Check dependencies
Write-Host "Step 1: Checking backend dependencies..." -ForegroundColor Yellow
try {
    cd "backend"
    python -c "import fastapi, sqlalchemy, uvicorn, pydantic; print('Dependencies OK')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies are installed" -ForegroundColor Green
    } else {
        throw "Dependencies missing"
    }
} catch {
    Write-Host "❌ Dependencies missing. Run: pip install -r requirements.txt" -ForegroundColor Red
    Write-Host "Install command: cd backend; pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 2: Start backend server
Write-Host "Step 2: Starting backend server..." -ForegroundColor Yellow
Write-Host "(Server will start in background. Press Ctrl+C to stop when done)" -ForegroundColor Gray

try {
    $serverJob = Start-Job -ScriptBlock {
        cd "backend"
        python server.py
    }
    Start-Sleep -Seconds 3
    Write-Host "✅ Backend server started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start backend server" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Run API tests
Write-Host "Step 3: Running API tests..." -ForegroundColor Yellow
cd ..
try {
    python manual_test.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All API tests passed!" -ForegroundColor Green
    } else {
        Write-Host "❌ API tests failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to run API tests" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check MySQL database: SELECT * FROM complaints;" -ForegroundColor White
Write-Host "2. Start frontend: cd Frontend; npm run dev" -ForegroundColor White
Write-Host "3. Login and submit complaint through UI" -ForegroundColor White
Write-Host "4. Verify complaint appears in complaints list" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to stop the server and exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop the server
Write-Host "Stopping server..." -ForegroundColor Yellow
Stop-Job $serverJob
Remove-Job $serverJob
Write-Host "✅ Server stopped" -ForegroundColor Green
