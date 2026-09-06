# Development launcher: starts the server WITHOUT opening its own app window,
# so it can be driven from a browser preview instead.
# For normal use, double-click "Start Glossary Apologetica.bat".

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:GA_NO_WINDOW = "1"
$env:GA_PORT = "7325"
Set-Location $root
node server.js
