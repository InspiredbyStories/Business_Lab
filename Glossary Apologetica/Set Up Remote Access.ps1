# =====================================================================
#  Turns on remote access for Glossary Apologetica.
#
#  Run it by right-clicking this file and choosing "Run with PowerShell".
#  You only need to run it once. After that, two small background helpers
#  start automatically — silently, no window — whenever you sign into
#  Windows on this computer:
#
#    1. The library server — always running, even if you never open the
#       desktop app window. This is what makes the library reachable.
#    2. The Cloudflare Tunnel — hands out a private web address
#       (something like https://random-words.trycloudflare.com) that
#       reaches this server without opening anything on your router.
#
#  IMPORTANT: that web address changes every time this computer restarts,
#  because no domain name was set up (a domain gives a permanent address —
#  ask if you'd like to add one later). Open the app's Settings page any
#  time to see the CURRENT address under "Remote access".
#
#  A password is required to open the library, whether from this computer
#  or another one — you'll be asked to set one the first time you open the
#  app after running this script, if you haven't already.
#
#  This does not need Administrator rights. It works by placing two small
#  files in your own Windows Startup folder — the same standard mechanism
#  many ordinary programs use to run automatically at sign-in.
#
#  TO TURN REMOTE ACCESS BACK OFF: run "Remove Remote Access.ps1".
# =====================================================================

$ErrorActionPreference = 'Stop'

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Join-Path $project 'app'
$toolsDir = Join-Path $appDir 'tools'
$cloudflaredExe = Join-Path $toolsDir 'cloudflared.exe'

# The server and the desktop app must agree on where the library lives, or
# entries added one way won't show up the other way. This matches the folder
# the installed desktop app already uses.
$dataDir = Join-Path $env:APPDATA 'glossary-apologetica\data'
$serverLog = Join-Path $dataDir 'server.log'
$tunnelLog = Join-Path $dataDir 'tunnel.log'
$port = 7325

$startupDir = [Environment]::GetFolderPath('Startup')
$serverCmd = Join-Path $dataDir 'run-server.cmd'
$tunnelCmd = Join-Path $dataDir 'run-tunnel.cmd'
$serverVbs = Join-Path $startupDir 'GlossaryApologetica-Server.vbs'
$tunnelVbs = Join-Path $startupDir 'GlossaryApologetica-Tunnel.vbs'

Write-Host ''
Write-Host '  Setting up remote access for Glossary Apologetica' -ForegroundColor Cyan
Write-Host '  --------------------------------------------------'

# ---- 1. cloudflared ---------------------------------------------------
if (-not (Test-Path $cloudflaredExe)) {
  Write-Host '  Downloading cloudflared (about 30 MB, first time only)...' -ForegroundColor Yellow
  New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
  Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflaredExe
  Write-Host '  Downloaded.'
} else {
  Write-Host '  cloudflared already downloaded.'
}

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

# ---- 2. locate node.exe -------------------------------------------------
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) { throw 'Node.js was not found. Install it from https://nodejs.org first.' }

# ---- 3. the two background scripts, each with its own restart loop ------
# If either process ever exits (a crash, a Windows update, anything), it
# waits five seconds and starts again, rather than staying down silently.
@"
@echo off
set GA_DATA_DIR=$dataDir
set GA_NO_WINDOW=1
set GA_MANAGED=1
set GA_PORT=$port
cd /d "$appDir"
:loop
"$nodeExe" server.js >> "$serverLog" 2>&1
timeout /t 5 /nobreak >nul
goto loop
"@ | Set-Content -Path $serverCmd -Encoding ascii

@"
@echo off
:loop
"$cloudflaredExe" tunnel --no-autoupdate --url http://127.0.0.1:$port >> "$tunnelLog" 2>&1
timeout /t 5 /nobreak >nul
goto loop
"@ | Set-Content -Path $tunnelCmd -Encoding ascii

# A tiny VBScript launcher is the standard trick for starting a program at
# sign-in with no console window flashing on screen.
function Write-SilentLauncher($vbsPath, $targetCmd) {
  @"
Set shell = CreateObject("WScript.Shell")
shell.Run """$targetCmd""", 0, False
"@ | Set-Content -Path $vbsPath -Encoding ascii
}

Write-SilentLauncher -vbsPath $serverVbs -targetCmd $serverCmd
Write-SilentLauncher -vbsPath $tunnelVbs -targetCmd $tunnelCmd
Write-Host '  Registered to start automatically at sign-in (no admin rights needed).'

# ---- 4. stop any already-running copies, then start fresh ---------------
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*$appDir*" -or $_.CommandLine -like "*$toolsDir*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Remove-Item $serverLog, $tunnelLog -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$shell = New-Object -ComObject WScript.Shell
$null = $shell.Run("`"$serverCmd`"", 0, $false)
Start-Sleep -Seconds 2
$null = $shell.Run("`"$tunnelCmd`"", 0, $false)

Write-Host '  Starting up...' -ForegroundColor Yellow
$foundUrl = $null
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $tunnelLog) {
    $m = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue |
      Select-Object -Last 1
    if ($m) { $foundUrl = $m.Matches[0].Value; break }
  }
}

Write-Host ''
if ($foundUrl) {
  Write-Host '  Done. Your library is reachable at:' -ForegroundColor Green
  Write-Host "  $foundUrl" -ForegroundColor Green
  Write-Host ''
  Write-Host '  You will be asked to set a password the first time you open that address.'
  Write-Host '  This same address is always shown in the app under Settings > Remote access.'
} else {
  Write-Host '  The tunnel is starting but has not connected yet.' -ForegroundColor Yellow
  Write-Host '  Open the app and check Settings > Remote access in a minute.'
}
Write-Host ''
Write-Host '  Both will start automatically, with no window, every time you sign into Windows.'
Write-Host ''
