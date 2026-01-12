param(
    [string]$PythonPath = 'C:\Users\HP\AppData\Local\Programs\Python\Python314\python.exe'
)

Write-Host "Using Python: $PythonPath"

if (-Not (Test-Path $PythonPath)) {
    Write-Error "Python executable not found at $PythonPath. Update the path and rerun the script."
    exit 1
}

Push-Location -Path (Join-Path $PSScriptRoot "..")

if (Test-Path ".venv") {
    Write-Host "Removing existing .venv..."
    Remove-Item -LiteralPath ".venv" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Creating new virtual environment (.venv) using $PythonPath..."
& $PythonPath -m venv .venv

$venvPython = Join-Path -Path ".venv\Scripts" -ChildPath "python.exe"
if (-Not (Test-Path $venvPython)) {
    Write-Error "Failed to create virtual environment. $venvPython not found."
    Pop-Location
    exit 1
}

Write-Host "Upgrading pip and installing requirements..."
& $venvPython -m pip install --upgrade pip setuptools wheel
& $venvPython -m pip install -r backend\requirements.txt

Write-Host "Verifying uvicorn is available..."
& $venvPython -m uvicorn --version

Write-Host "Virtual environment setup complete. To activate use: .\.venv\Scripts\Activate.ps1"

Pop-Location
