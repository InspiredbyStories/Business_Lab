@echo off
title Glossary Apologetica
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this computer.
  echo   Glossary Apologetica needs it to run.
  echo.
  echo   Install it from https://nodejs.org  ^(choose the LTS version^),
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting Glossary Apologetica...
echo   A window will open in a moment.
echo.

node server.js

echo.
echo   Glossary Apologetica has stopped.
pause
