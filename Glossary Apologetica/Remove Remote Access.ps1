# Turns remote access back off: stops the background server and tunnel, and
# removes them from Windows' Startup folder so they don't start again at
# your next sign-in. Your library and everything in it is untouched — this
# only stops the app from being reachable from outside this computer. The
# desktop app keeps working normally.

$ErrorActionPreference = 'SilentlyContinue'

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Join-Path $project 'app'
$toolsDir = Join-Path $appDir 'tools'
$startupDir = [Environment]::GetFolderPath('Startup')

Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cloudflared.exe'" |
  Where-Object { $_.CommandLine -like "*$appDir*" -or $_.CommandLine -like "*$toolsDir*" } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
    Write-Host "  Stopped process $($_.ProcessId)"
  }

foreach ($name in @('GlossaryApologetica-Server.vbs', 'GlossaryApologetica-Tunnel.vbs')) {
  $p = Join-Path $startupDir $name
  if (Test-Path $p) {
    Remove-Item $p -Force
    Write-Host "  Removed from Startup: $name"
  }
}

Write-Host ''
Write-Host '  Remote access is off. Nothing in your library was changed.'
Write-Host '  Run "Set Up Remote Access.ps1" again any time to turn it back on.'
Write-Host ''
