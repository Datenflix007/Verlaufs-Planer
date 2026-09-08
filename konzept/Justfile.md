# Justfile und Entwicklungsbefehle

## Zweck

Das Projekt soll fuer Menschen und LLM-Agenten mit wenigen konsistenten Befehlen bedienbar sein. Eine `justfile` dient als dokumentierter Einstieg fuer Installation, Entwicklung, Datenvorbereitung, Tests und Start.

Diese Datei beschreibt die erwarteten Befehle. Die echte `justfile` muss spaeter im Repository-Root angelegt werden.

## Erwartete Befehle

```bash
just install
```

Installiert Projektabhaengigkeiten. In der geplanten SvelteKit-/TypeScript-Struktur bedeutet das mindestens `npm install`.

```bash
just dev
```

Startet die Anwendung im Entwicklungsmodus.

```bash
just build
```

Erstellt einen Produktionsbuild.

```bash
just preview
```

Startet den gebauten Produktionsstand lokal zur Kontrolle.

```bash
just test
```

Fuehrt Unit- und Integrationstests aus.

```bash
just lint
```

Prueft Formatierung, Typen und statische Regeln.

```bash
just format
```

Formatiert den Code automatisch.

```bash
just db-migrate
```

Fuehrt Datenbankmigrationen fuer SQLite aus.

```bash
just db-seed
```

Legt Standarddaten an, zum Beispiel Standardmodelle und Standardphasentypen.

```bash
just preprocess
```

Liest Rohdaten aus `rawData/`, extrahiert Text und Metadaten und schreibt annotierte Lehrplan- und Kompetenzdaten in die lokale Datenbank oder in einen reproduzierbaren Zwischenstand.

```bash
just setup
```

Startet die Setup-UI oder einen Setup-Assistenten. Nutzende waehlen dort Bundesland, Fach, Schulform, Kompetenzrahmen und lokale Einstellungen.

```bash
just run
```

Startet die lokale Anwendung fuer normale Nutzung. Wenn Abhaengigkeiten oder Datenbank fehlen, soll der Befehl mit einer klaren Fehlermeldung abbrechen und den passenden naechsten Befehl nennen.

## Plattformen

Die Projektbefehle sollen unter Windows, macOS und Linux funktionieren. Da der aktuelle Nutzerkontext Windows/PowerShell ist, muessen Setup-Anweisungen PowerShell-kompatibel sein.

## Installationshinweise fuer just

Die konkrete Installationsanleitung wird spaeter im README ergaenzt. Ziel ist eine Copy-Paste-freundliche Sequenz fuer:

- Windows mit PowerShell
- macOS mit Homebrew
- Linux mit Paketmanager oder Cargo

## Anforderungen an Befehle

- Jeder Befehl muss idempotent sein, soweit sinnvoll.
- Fehlermeldungen muessen naechste Schritte nennen.
- Befehle duerfen keine Nutzerdaten loeschen.
- Befehle fuer Datenmigration und Preprocessing muessen Backups respektieren.
- LLM-Agenten sollen neue Automatisierungen zuerst hier dokumentieren und dann in der echten `justfile` umsetzen.

## Beispiel fuer spaetere justfile

```make
install:
    npm install

dev:
    npm run dev

build:
    npm run build

test:
    npm test

lint:
    npm run lint

format:
    npm run format

db-migrate:
    npm run db:migrate

db-seed:
    npm run db:seed

preprocess:
    npm run preprocess

setup:
    npm run setup

run:
    npm run start
```
