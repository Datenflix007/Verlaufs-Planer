@echo off
setlocal EnableExtensions

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [Fehler] Node.js 22.5 oder neuer wurde nicht gefunden.
  echo Installieren Sie Node.js LTS und starten Sie diese Datei erneut.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [Fehler] npm wurde nicht gefunden. Bitte installieren Sie Node.js inklusive npm.
  exit /b 1
)

for /f "tokens=1,2 delims=." %%A in ('node -p "process.versions.node"') do (
  set NODE_MAJOR=%%A
  set NODE_MINOR=%%B
)
if %NODE_MAJOR% LSS 22 goto node_too_old
if %NODE_MAJOR% EQU 22 if %NODE_MINOR% LSS 5 goto node_too_old
goto node_ok

:node_too_old
echo [Fehler] Gefunden wurde Node.js %NODE_MAJOR%.%NODE_MINOR%. Erforderlich ist mindestens Node.js 22.5.
exit /b 1

:node_ok
if not exist "node_modules\.bin\vite.cmd" (
  echo [1/2] Installiere Abhaengigkeiten aus package-lock.json ...
  call npm.cmd ci
  if errorlevel 1 (
    echo [Fehler] Die Abhaengigkeiten konnten nicht installiert werden.
    exit /b 1
  )
) else (
  echo [1/2] Abhaengigkeiten sind vorhanden.
)

echo [2/2] Starte Verlaufsplaner mit lokaler SQLite-Datenbank ...
if "%HOST%"=="" (set APP_HOST=127.0.0.1) else (set APP_HOST=%HOST%)
if "%PORT%"=="" (set APP_PORT=5173) else (set APP_PORT=%PORT%)
echo Die Anwendung ist anschliessend unter http://%APP_HOST%:%APP_PORT% erreichbar.
echo Mit Strg+C beenden.
call npm.cmd run dev
exit /b %errorlevel%
