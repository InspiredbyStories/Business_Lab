# =====================================================================
#  Builds the Windows installer for Glossary Apologetica.
#
#  Run it by right-clicking this file and choosing "Run with PowerShell",
#  or from a terminal:   powershell -ExecutionPolicy Bypass -File "Build Installer.ps1"
#
#  What it does:
#    1. copies the application source into a build workspace (.build)
#    2. downloads Electron and the installer builder the first time only
#    3. produces  installer\Glossary-Apologetica-Setup-<version>.exe
#
#  TO RELEASE AN UPDATE: raise "version" in app\package.json, run this again,
#  and give the new installer to anyone using the program. Installing it over
#  the old version keeps every entry, note and file — the library is stored
#  separately, in the Windows application-data folder.
# =====================================================================

$ErrorActionPreference = 'Stop'

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $project 'app'
$work = Join-Path $project '.build'
$outDir = Join-Path $project 'installer'

Write-Host ''
Write-Host '  Building Glossary Apologetica installer' -ForegroundColor Cyan
Write-Host '  ---------------------------------------'

# ---- 1. refresh the build workspace --------------------------------
if (-not (Test-Path $work)) { New-Item -ItemType Directory -Path $work | Out-Null }

foreach ($item in @('server.js', 'package.json')) {
  Copy-Item (Join-Path $source $item) (Join-Path $work $item) -Force
}
foreach ($dir in @('src', 'public', 'tools', 'electron', 'build')) {
  $dest = Join-Path $work $dir
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Copy-Item (Join-Path $source $dir) $dest -Recurse -Force
}
Write-Host '  Source copied.'

# ---- 2. dependencies (Electron itself) ------------------------------
Push-Location $work
try {
  if (-not (Test-Path (Join-Path $work 'node_modules\electron'))) {
    Write-Host '  Downloading Electron (about 250 MB, first time only)...' -ForegroundColor Yellow
    npm install --no-audit --no-fund --loglevel=error
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
  } else {
    Write-Host '  Dependencies already present.'
  }

  # ---- 3. build ------------------------------------------------------
  Write-Host '  Packaging the application...' -ForegroundColor Yellow
  # Windows builds do not need code-signing tools, and downloading them
  # (electron-builder fetches a macOS signing package by default) fails on
  # accounts without permission to create symbolic links. Skip that lookup.
  $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  npx --no-install electron-builder --win nsis
  if ($LASTEXITCODE -ne 0) { throw 'electron-builder failed.' }
}
finally {
  Pop-Location
}

# ---- 4. collect the result -----------------------------------------
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$installer = Get-ChildItem (Join-Path $work 'dist') -Filter '*Setup*.exe' |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($null -eq $installer) { throw 'No installer was produced.' }

Copy-Item $installer.FullName $outDir -Force
$final = Join-Path $outDir $installer.Name

Write-Host ''
Write-Host '  Done.' -ForegroundColor Green
Write-Host ("  Installer: " + $final)
Write-Host ("  Size:      " + [math]::Round($installer.Length / 1MB, 1) + " MB")
Write-Host ''
