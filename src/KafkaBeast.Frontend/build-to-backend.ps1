# Build Angular app and deploy to Dashboard wwwroot
# Usage: .\build-to-backend.ps1 [-Dev]

param(
    [switch]$Dev
)

$config = if ($Dev) { "development" } else { "production" }
$wwwrootPath = "..\KafkaBeast.Dashboard\wwwroot"

Write-Host "Building Angular app with $config configuration..." -ForegroundColor Cyan

# Clean wwwroot
if (Test-Path $wwwrootPath) {
    Get-ChildItem $wwwrootPath -Exclude ".gitkeep" | Remove-Item -Recurse -Force
}

# Build Angular
npx ng build --configuration=$config

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Move files from browser subfolder to wwwroot root (Angular 19+ structure)
$browserPath = "$wwwrootPath\browser"
if (Test-Path $browserPath) {
    Move-Item -Path "$browserPath\*" -Destination $wwwrootPath -Force
    Remove-Item $browserPath -Recurse -Force
}

Write-Host "Angular app built and deployed to wwwroot!" -ForegroundColor Green
Write-Host "Run 'dotnet run' in KafkaBeast.Dashboard to start the full application." -ForegroundColor Yellow
