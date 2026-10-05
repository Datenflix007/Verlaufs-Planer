# Betriebsarchitektur: lokal, LAN und späterer Server

Stand: 5. Oktober 2026

## Tatsächlicher Stand

Der Verlaufsplaner ist eine Vue/Vite-Anwendung mit einem gemeinsamen API-Router. `npm run dev` hängt ihn in Vites Entwicklungsserver ein; `npm run start` liefert nach `npm run build` die gebaute SPA und dieselben API-Routen ohne Vite-HMR aus. Die fachlichen Zugriffe liegen hinter Repository-Adapterklassen; die SQLite-Datenbank enthält Plan-Payloads, Materialmetadaten, Präsentationsmedien, Arbeitsbereichseinstellungen und relationale Schulplanungsdaten.

Die zentrale Konfiguration trennt Laufzeitwerte von Code. Authentifizierung, Ownership, Teams und Freigaben sind weiterhin offen und müssen vor LAN-Mehrbenutzerbetrieb abgeschlossen werden.

Die additive SQLite-Migration `users` bildet Konten mit eindeutigem, kleingeschriebenem Login-Identifier, Anzeigename, USER/ADMIN-Rolle, Aktivstatus und Zeitstempeln ab. Der zugehörige Passwortdienst speichert ausschließlich Argon2id-Hashes; Klartextpasswörter, Hashes und Secrets werden weder über öffentliche Accountdaten noch über Logs ausgegeben. Session-Lebenszyklus und Rechteprüfung bleiben eigenständige, überprüfbare Sicherheitsbausteine.

## Betriebsformen

```text
LOCAL:    Browser -> 127.0.0.1:PORT -> Vite-API -> SQLite
NETWORK: Browser -> LAN-IP:PORT     -> App-Server -> SQLite + Storage
SERVER:  Browser -> HTTPS Proxy     -> App-Server -> DB + Storage
```

`local` bindet standardmäßig nur an `127.0.0.1`. `network` und `server` erfordern eine explizite Wahl von `APP_MODE` und erlauben erst dann `HOST=0.0.0.0`. Für den Übergang wird dieselbe User-, Rollen- und Policy-Schicht verwendet; es entsteht keine zweite lokale Datenmodellvariante.

## Konfiguration

Die Variablen sind in `.env.example` dokumentiert. Relative Pfade werden gegen das Arbeitsverzeichnis aufgelöst; ein Systemdienst sollte daher absolute Pfade in einem persistenten Verzeichnis verwenden.

```dotenv
APP_MODE=network
HOST=0.0.0.0
PORT=5173
DATABASE_URL=/var/lib/verlaufsplaner/verlaufsplaner.sqlite
STORAGE_PATH=/var/lib/verlaufsplaner/storage
BASE_URL=https://verlaufsplaner.example.de
SESSION_SECRET=not-committed-here
```

`SESSION_SECRET` wird erst eingeführt, wenn die Session-Implementierung besteht. Es gehört weder in Git noch in eine clientseitige Vite-Variable.

## Daten und Backups

Aktuell müssen die SQLite-Datei aus `DATABASE_URL` und – sobald Upload-Storage umgesetzt ist – `STORAGE_PATH` gesichert werden. Backups erfolgen konsistent bei beendeter Anwendung oder über eine spätere SQLite-Backup-Routine. Das `data/`-Verzeichnis und `.env` sind absichtlich von Git ausgeschlossen.

## Reverse Proxy und HTTPS

Der spätere Anwendungsserver soll nur auf einer privaten Adresse lauschen; nginx, Caddy oder Traefik terminiert TLS und leitet die ursprüngliche Host- und Protokollinformation weiter. `BASE_URL` beschreibt die öffentliche https-Adresse. Die Session-Schicht setzt dann HTTP-only, SameSite- und Secure-Cookies und vertraut Proxy-Headern nur aus einer explizit konfigurierten Proxy-Umgebung.

Bis AUTH-03, AUTH-05 und SERVER-03 abgeschlossen sind, ist ein offener Port kein unterstützter Mehrbenutzer- oder Internetbetrieb.
