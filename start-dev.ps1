# One-command local start: backend (8000) and frontend (3000) in separate windows.
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

if (-not (Test-Path (Join-Path $backend ".venv"))) {
    Write-Host "Creating backend virtualenv and installing dependencies..."
    python -m venv (Join-Path $backend ".venv")
    & (Join-Path $backend ".venv\Scripts\python.exe") -m pip install -q -r (Join-Path $backend "requirements.txt")
}
if (-not (Test-Path (Join-Path $backend ".env"))) {
    Copy-Item (Join-Path $backend ".env.example") (Join-Path $backend ".env")
    Write-Host "Created backend\.env - add your GEMINI_API_KEY there, then restart the backend."
}
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    Push-Location $frontend; npm install --no-audit --no-fund; Pop-Location
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev"
Write-Host "Backend:  http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:3000"
