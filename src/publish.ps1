# Publish KafkaBeast Dashboard as a self-contained executable
# Usage: .\publish.ps1 [-Runtime <rid>] [-Output <path>]
#
# Examples:
#   .\publish.ps1                           # Default: win-x64
#   .\publish.ps1 -Runtime linux-x64        # Linux x64
#   .\publish.ps1 -Runtime osx-arm64        # macOS ARM
#   .\publish.ps1 -Output C:\Release        # Custom output

param(
    [string]$Runtime = "win-x64",
    [string]$Output = ".\publish\$Runtime"
)

$ErrorActionPreference = "Stop"
$projectPath = "KafkaBeast.Dashboard\KafkaBeast.Dashboard.csproj"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " KafkaBeast Dashboard Publisher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Angular frontend
Write-Host "[1/3] Building Angular frontend..." -ForegroundColor Yellow
Push-Location "KafkaBeast.Frontend"

try {
    npx ng build --configuration=production
    if ($LASTEXITCODE -ne 0) { throw "Angular build failed" }
    
    # Move files from browser subfolder
    $browserPath = "..\KafkaBeast.Dashboard\wwwroot\browser"
    if (Test-Path $browserPath) {
        Move-Item -Path "$browserPath\*" -Destination "..\KafkaBeast.Dashboard\wwwroot\" -Force
        Remove-Item $browserPath -Recurse -Force
    }
    Write-Host "   Angular build complete!" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Step 2: Publish .NET application
Write-Host ""
Write-Host "[2/3] Publishing .NET application for $Runtime..." -ForegroundColor Yellow

dotnet publish $projectPath `
    --configuration Release `
    --runtime $Runtime `
    --output $Output `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:EnableCompressionInSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:DebugType=embedded

if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host "   .NET publish complete!" -ForegroundColor Green

# Step 3: Summary
Write-Host ""
Write-Host "[3/3] Creating release package..." -ForegroundColor Yellow

$outputPath = Resolve-Path $Output
$files = Get-ChildItem $outputPath -File
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Publish Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output: $outputPath" -ForegroundColor White
Write-Host "Runtime: $Runtime" -ForegroundColor White
Write-Host "Files: $($files.Count)" -ForegroundColor White
Write-Host "Size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "To run on target machine:" -ForegroundColor Yellow

if ($Runtime -like "win-*") {
    $exeName = "KafkaBeast.Dashboard.exe"
    Write-Host "  .\$exeName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NOTE: On first run, Windows SmartScreen may show a warning." -ForegroundColor Yellow
    Write-Host "Click 'More info' then 'Run anyway' to proceed." -ForegroundColor Yellow
    Write-Host "For production, sign the executable with a code signing certificate." -ForegroundColor Yellow
} else {
    $exeName = "KafkaBeast.Dashboard"
    Write-Host "  chmod +x ./$exeName && ./$exeName" -ForegroundColor Cyan
}
Write-Host ""
