# Technische Architektur

## Ziel

Die technische Architektur soll einen lokalen MVP ermoeglichen und trotzdem spaeter Netzwerk- und Webbetrieb zulassen. Der Kern ist eine TypeScript-Anwendung mit SvelteKit, SQLite und klar getrennten Modulen fuer Planung, Modelle, Kompetenzdaten, Export, Benutzerverwaltung und optionale LLM-Unterstuetzung.

## Stack-Empfehlung

### Frontend

- SvelteKit
- TypeScript
- komponentenbasierte UI
- serverseitige Routen fuer Datenzugriff
- responsive Layouts fuer Desktop, Tablet und Beamer-/Praesentationssituationen

### Backend

- SvelteKit Server Routes oder ein eng integrierter Node-Server
- SQLite als lokale Datenbank
- Migrationen fuer schema versioning
- typsicherer Datenzugriff, zum Beispiel ueber Drizzle ORM oder eine vergleichbare leichte SQL-Schicht

### Desktop und lokale Nutzung

Der MVP kann als lokaler Webserver laufen. Eine spaetere Desktop-Verpackung mit Tauri ist moeglich, aber nicht Voraussetzung fuer den ersten MVP.

### Netzwerk und Web

Mit SvelteKit adapter-node kann dieselbe App lokal, im LAN oder auf einem Server laufen. Fuer Webbetrieb muessen HTTPS, sichere Cookies, Backups, Rollen und Mandantenfaehigkeit ergaenzt werden.

## Laufzeitmodell

```text
Browser/Svelte UI
  -> SvelteKit Actions und API Routes
    -> Service-Schicht
      -> Datenbankzugriff
        -> SQLite
      -> Export-Service
      -> Preprocessing-Service
      -> LLM-Service
```

## Hauptmodule

### `planner`

Verantwortlich fuer Reihen, Stunden, Phasen, Lernziele, Materialien und Durchfuehrungsnotizen.

### `models`

Verantwortlich fuer frei definierbare Verlaufsplan-Modelle, Modellversionen, Spalten, Felder, Phasentypen und Validierungen.

### `curriculum`

Verantwortlich fuer Fachlehrplaene, Kompetenzrahmen, Quellen, Annotationen und Suche.

### `users`

Verantwortlich fuer Registrierung, Login, Rollen, Sessions und Einstellungen.

### `export`

Verantwortlich fuer PDF, spaeter HTML, H5P oder Materialpakete.

### `runmode`

Verantwortlich fuer live nutzbare Durchfuehrung, Timer, manuelles Weiterschalten und Beobachtungsnotizen.

### `llm`

Verantwortlich fuer lokale LLM-Anbindung, Prompt-Kontexte, Vorschlaege und Kennzeichnung von KI-generierten Inhalten.

## Vorgeschlagene Code-Struktur

```text
src/
  routes/
    +layout.svelte
    +page.svelte
    setup/
    planner/
    models/
    curriculum/
    run/
    settings/
    api/
  lib/
    components/
    server/
      db/
      services/
      auth/
      export/
      preprocess/
      llm/
    shared/
      types/
      validation/
      constants/
tests/
  unit/
  integration/
scripts/
  preprocess/
  seed/
```

## Datenfluss fuer Planung

1. Nutzer waehlt Kontext: Bundesland, Fach, Lerngruppe, Modell.
2. App laedt passende Kompetenzdaten.
3. Nutzer erstellt Reihe oder Einzelstunde.
4. Nutzer legt Lernziele und Kompetenzbezuege fest.
5. Nutzer plant Phasen.
6. Validierung prueft Modellregeln und Zeitlogik.
7. Plan wird gespeichert.
8. Plan kann exportiert oder im Durchfuehrungsmodus gestartet werden.
9. Beobachtungen werden als Reflexionsdaten gespeichert.

## Datenfluss fuer Lehrplanimport

1. Rohdateien liegen in `rawData/`.
2. `just preprocess` extrahiert Text und Metadaten.
3. Annotationen werden erzeugt.
4. Unsichere Stellen erhalten `review_needed`.
5. Gepruefte Daten stehen im Kompetenzbrowser zur Verfuegung.

## LLM-Architektur

LLM-Funktionen laufen ueber eine Backend-Schicht. Der Browser soll nicht direkt mit einem lokalen Modellserver sprechen.

Gruende:

- bessere Kontrolle ueber Datenschutz
- einheitliche Fehlerbehandlung
- Prompt-Kontexte koennen serverseitig gebaut werden
- spaetere Providerwechsel bleiben moeglich

Der erste Zielprovider kann ein lokaler Ollama-kompatibler Dienst sein. Die App muss aber auch ohne LLM voll nutzbar bleiben.

## PDF-Export

Fuer den MVP gibt es zwei plausible Wege:

- Browserdruck aus einer dedizierten Druckansicht
- serverseitiges Rendering mit Playwright

Die Druckansicht ist schneller umzusetzen. Serverseitiges Rendering ist reproduzierbarer und besser fuer spaetere Batch-Exporte. Die Konzeptentscheidung sollte im MVP getroffen werden.

## Qualitaetsanforderungen

- TypeScript strikt verwenden.
- Datenbankmigrationen versionieren.
- Zentrale Entitaeten mit stabilen IDs speichern.
- Service-Logik nicht direkt in UI-Komponenten verstecken.
- Tests fuer Modellvalidierung, Zeitberechnung, Kompetenzzuordnung und Exportlogik.
- Keine sensiblen Daten im Log ausgeben.
- App muss ohne Internet starten koennen, wenn alle lokalen Daten vorhanden sind.

## Offene Entscheidungen

- Drizzle ORM, Kysely oder direkte SQL-Schicht?
- Tauri direkt einplanen oder erst nach Webserver-MVP?
- PDF zuerst ueber Druckansicht oder Playwright?
- Soll der Preprocessor komplett in TypeScript bleiben?
