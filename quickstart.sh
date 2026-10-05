#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "[Fehler] Node.js 22.5 oder neuer wurde nicht gefunden." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[Fehler] npm wurde nicht gefunden. Bitte installieren Sie Node.js inklusive npm." >&2
  exit 1
fi

IFS=. read -r node_major node_minor _ <<< "$(node -p 'process.versions.node')"
if (( node_major < 22 || (node_major == 22 && node_minor < 5) )); then
  echo "[Fehler] Gefunden wurde Node.js ${node_major}.${node_minor}. Erforderlich ist mindestens Node.js 22.5." >&2
  exit 1
fi

if [[ ! -x node_modules/.bin/vite ]]; then
  echo "[1/2] Installiere Abhängigkeiten aus package-lock.json ..."
  npm ci
else
  echo "[1/2] Abhängigkeiten sind vorhanden."
fi

host="${HOST:-127.0.0.1}"
port="${PORT:-5173}"
echo "[2/2] Starte Verlaufsplaner mit lokaler SQLite-Datenbank ..."
echo "Die Anwendung ist anschließend unter http://${host}:${port} erreichbar."
echo "Mit Strg+C beenden."
exec npm run dev
