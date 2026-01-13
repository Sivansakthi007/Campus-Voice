# Campus Voice - Quick Deploy Script

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Campus Voice - Production Deploy" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Check for remote
$remote = git remote
if (-not $remote) {
    Write-Host ""
    Write-Host "Please enter your GitHub repository URL:" -ForegroundColor Yellow
    Write-Host "Example: https://github.com/Sivansakthi007/campus-voice.git" -ForegroundColor Gray
    $repoUrl = Read-Host "Repository URL"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "Remote added successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "No repository URL provided. Skipping remote setup." -ForegroundColor Red
        exit
    }
}

# Add and commit all files
Write-Host ""
Write-Host "Preparing files for deployment..." -ForegroundColor Yellow
git add .
git commit -m "Production deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Push to GitHub
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Code pushed to GitHub successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://dashboard.render.com/" -ForegroundColor White
Write-Host "2. Click 'New' -> 'Blueprint'" -ForegroundColor White
Write-Host "3. Connect your GitHub repository" -ForegroundColor White
Write-Host "4. Render will automatically deploy using render.yaml" -ForegroundColor White
Write-Host "5. Configure environment variables in Render dashboard:" -ForegroundColor White
Write-Host "   - MYSQL_PASSWORD (from database service)" -ForegroundColor Gray
Write-Host "   - DATABASE_URL (mysql+aiomysql://...)" -ForegroundColor Gray
Write-Host "   - LLM_KEY (your OpenAI API key)" -ForegroundColor Gray
Write-Host ""
Write-Host "Your app will be available at:" -ForegroundColor Cyan
Write-Host "https://campus-voice-frontend.onrender.com" -ForegroundColor Green
Write-Host ""
