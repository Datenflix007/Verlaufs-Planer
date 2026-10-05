# Verlaufsplaner

Der Verlaufsplaner ist ein lokales Planungswerkzeug für Lehrkräfte, Lehramtsstudierende, Dozierende und Workshop-Leitende. Unterrichts- und Workshopplanungen werden strukturiert erfasst, lokal gespeichert und als vollständige Dokumente exportiert.


https://github.com/user-attachments/assets/d72675a8-3515-4ba4-8cf5-8ade32a83df9

https://github.com/user-attachments/assets/d240563e-e1f4-4494-9c72-58cee88119cb





## Funktionen

- Mehrere lokale Planungen anlegen, öffnen, duplizieren und löschen; JSON-Import und -Backups. Neue Einzelplanungen starten über **Neue Planung** im Dashboard, der JSON-Import liegt unter **Einstellungen → Arbeitsbereich**.
- Allgemeine Angaben, ein- und mehrtägige Termine, Lernziele und Kompetenzen aus austauschbaren Katalogen.
- Rich-Text-Editoren für Inhaltsanalyse und methodisch-didaktische Analyse mit Formatierungen, Überschriften, Listen, Zitaten, Links, Hoch-/Tiefstellung, Tabellen, Rückgängig/Wiederholen und expliziten Raw-LaTeX-Knoten.
- Anpassbare Verlaufsplanlayouts mit Phasen und Pausen, Startzeit- oder Minutenansicht, verschiebbaren Zeilen und Materialzuordnung. Benutzerdefinierte Markdown-Muster werden lokal in SQLite gespeichert.
- Konfigurierbares Dashboard mit Kalender, nächsten Planungen, Aufgaben und Materialvorbereitung. Widgets lassen sich im visuellen 12-Spalten-Editor anordnen und skalieren.
- Zentrale Materialliste mit automatischer Verwendungsaggregation; Gebäude, Räume und Bestände werden im Arbeitsbereich verwaltet.
- Fach- und Disziplinvorlagen als Startpunkt, darunter eine Digital-Humanities-Vorlage mit referenzierten Kompetenzrahmen sowie lokale JSON-Vorlagen.
- HTML-, LaTeX- und JSON-Export sowie Browserdruck für PDF mit echtem Text und Print-CSS.

## Präsentationen

- Planbezogener Präsentationseditor mit Folien, Canvas-Elementen, Mindmaps, Themes und Sprechernotizen.
- Presenter Console mit Foliennavigation, aktueller und nächster Folie, Notizen und Timer.
- Separates Audience-Fenster für Beamer oder Zweitbildschirm; die Folien werden über BroadcastChannel synchronisiert.
- Stabile Präsentationseinstiegspunkte aus dem Verlaufsplan über unveränderliche Folien-IDs.

Details zu Datenmodell, Migration, Folienverweisen und Browser-Fallbacks: [konzept/PRESENTATION_MODE.md](konzept/PRESENTATION_MODE.md).

## Planungsvorlagen

Beim Anlegen einer Planung lässt sich optional ein fachlicher Kontext wählen. Die Vorlage **Digital Humanities** aktiviert DigComp 3.0 und hebt passende Kompetenzen hervor; alle 21 DigComp-Kompetenzen bleiben auswählbar. Ein Vorlagenwechsel löscht keine Inhalte. Unter **Vorlagen verwalten** können eigene Vorlagen lokal importiert, exportiert, dupliziert, umbenannt und gelöscht werden. Details: [konzept/Planungsvorlagen.md](konzept/Planungsvorlagen.md).

## Erste Schritte





Voraussetzung ist Node.js ab Version 22.5.

```powershell
npm install
npm run dev
```

Alternativ starten `quickstart.bat` unter Windows oder `bash quickstart.sh` unter macOS, Linux und WSL die Anwendung. Beide Skripte prüfen Node.js, installieren bei Bedarf die Abhängigkeiten und starten den lokalen Server einschließlich SQLite-API.

Öffne anschließend die von Vite angezeigte lokale Adresse. `npm run dev` startet Oberfläche und SQLite-Schnittstelle; beim ersten Start wird `data/verlaufsplaner.sqlite` angelegt.

Für den produktionsnahen lokalen oder Raspberry-Pi-Betrieb wird einmal gebaut und anschließend der schlanke Node-Server gestartet:

```powershell
npm run build
npm run start
```

`npm run start` liefert die erzeugten Dateien aus `dist/` und dieselben API-Routen ohne Vite-HMR aus.


## Entwicklung und Qualität

```powershell
npm run check
npm test -- --run
npm run test:e2e
npm run build
```

Die Unit-Tests prüfen unter anderem Zeitlogik, Materialaggregation, Migrationen, JSON-Validierung, Exportausgaben und Layoutdefinitionen. Die Playwright-E2E-Tests benötigen Microsoft Edge.

## Datenhaltung und Sicherheit

Texte werden UTF-8-kodiert gespeichert. Umlaute bleiben in SQLite sowie in JSON- und HTML-Exporten erhalten.

Planungen, Verlaufsplan-Muster und Arbeitsbereichseinstellungen liegen lokal in `data/verlaufsplaner.sqlite`. Der Ordner `data/` ist absichtlich von Git ausgeschlossen und kann persönliche Beispiele enthalten. Beim ersten Öffnen überträgt die Anwendung vorhandene Browser-Planungen einmalig und nicht destruktiv nach SQLite. Exportiere regelmäßig JSON-Backups.

Normale Texte werden im LaTeX-Export escaped. Nur der bewusst über **LaTeX** im Rich-Text-Editor eingefügte Knoten wird unverändert in die `.tex`-Datei übernommen.

## Betrieb und Konfiguration

Ohne Konfiguration läuft der Verlaufsplaner als lokaler Einzelplatzdienst unter `http://127.0.0.1:5173`. Die zentrale Konfiguration liegt in Umgebungsvariablen; kopiere bei Bedarf `.env.example` nach `.env`. Diese Datei enthält Geheimnisse und wird nicht eingecheckt.

| Variable | Standard | Zweck |
| --- | --- | --- |
| `APP_MODE` | `local` | `local`, `network` oder `server`; Netzwerk- und Serverbetrieb sind bewusst opt-in. |
| `HOST` | `127.0.0.1` | Bind-Adresse; `0.0.0.0` ist nur mit `APP_MODE=network` oder `server` erlaubt. |
| `PORT` | `5173` | HTTP-Port zwischen 1 und 65535. |
| `DATABASE_URL` | `data/verlaufsplaner.sqlite` | Pfad zur persistenten SQLite-Datenbank. |
| `STORAGE_PATH` | `data/storage` | Vorgesehener Pfad für ein künftiges lokales Storage-Backend. |
| `BASE_URL` | – | Öffentliche http(s)-Basisadresse, später für Reverse Proxy und sichere Session-Cookies. |
| `SESSION_SECRET` | – | Vorgesehener geheimer Session-Schlüssel; erst mit der noch ausstehenden Authentifizierung erforderlich. |

Für einen Raspberry Pi oder das LAN setzen Sie explizit `APP_MODE=network` und `HOST=0.0.0.0`; der Rechner muss zusätzlich über seine LAN-Adresse oder seinen lokalen Hostnamen erreichbar sein. `npm run start` liefert die gebaute Anwendung mit derselben API ohne Vite-HMR aus. Benutzerkonten sind als Datenmodell vorbereitet, aber Login, Passwort-Hashing und serverseitige Berechtigungen folgen erst in den nächsten Schritten; veröffentlichen Sie diese Zwischenversion deshalb nicht im Internet.

Sichern Sie mindestens die unter `DATABASE_URL` liegende SQLite-Datei sowie künftig das Verzeichnis unter `STORAGE_PATH`, während die Anwendung beendet ist. Für späteren HTTPS-Betrieb hinter nginx, Caddy oder Traefik wird `BASE_URL=https://…` gesetzt; die geplante Session-Schicht erkennt daran sichere Cookies. Weitere Details: [Betriebsarchitektur](docs/architecture/SERVER_DEPLOYMENT.md).

## Projektstruktur

```text
src/
  components/       Editor-, Dashboard-, Vorschau- und Exportkomponenten
  data/             Layouts, Kompetenzkataloge und Planungsvorlagen
  domain/           Planungsmodell sowie Zeit- und Materiallogik
  export/           JSON-, HTML- und LaTeX-Exporter
  repositories/     Zugriff auf die lokale SQLite-Persistenz
  stores/           Projekt- und UI-Zustand
server/              Lokale SQLite-API für Vite
data/                Nicht versionierte Datenbank und Samples
konzept/             Architektur, Datenmodell und Produktkonzepte
media/               UI-Aufnahme für diese README
```

Weitere Details: [Architektur](konzept/ARCHITECTURE.md), [Datenmodell](konzept/DATA_MODEL.md), [Roadmap](konzept/ROADMAP.md) und [TODO](TODO.md).

## Roadmap

Geplant sind unter anderem Reihenplanung, Materialanhänge, ein interaktiver Arbeitsblatt-Editor sowie optionale Cloud- und Desktop-Speicherimplementierungen. Details stehen in [konzept/ROADMAP.md](konzept/ROADMAP.md).
