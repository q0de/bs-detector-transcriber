# Run Flask Development Server
# This opens in a new visible window so you can see logs

Write-Host "Starting Flask Backend Development Server..." -ForegroundColor Green
Write-Host "Backend will run at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Activate venv and run Flask
& ".\venv\Scripts\Activate.ps1"
python app.py

