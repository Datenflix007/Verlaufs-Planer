# Justfile und Entwicklungsbefehle

## Zweck

Das Projekt soll fuer Menschen und LLM-Agenten mit wenigen konsistenten Befehlen bedienbar sein. Die echte `justfile` liegt im Repository-Root und kapselt Installation, Entwicklung, Datenbank, Preprocessing, Tests und Build.

## Voraussetzungen

- Node.js und npm
- optional `just` fuer die Kurzbefehle
- lokale SQLite-Datei unter `data/verlaufs-planer.sqlite`

Falls `just` nicht installiert ist, koennen die darunterliegenden `npm`-Befehle direkt genutzt werden.

## Aktuelle Befehle

```bash
just install
```

Installiert Abhaengigkeiten mit `npm install --legacy-peer-deps`. Dieser Modus ist aktuell bewusst gesetzt, weil die lokale npm-Version bei der SvelteKit-Addon-Installation einen Peer-Dependency-Arborist-Fehler ausloesen kann.

```bash
just bootstrap
```

Fuehrt Installation, Datenbank-Setup, Seed-Daten und Thueringen-Preprocess aus.

```bash
just dev
```

Startet SvelteKit lokal auf `127.0.0.1:5173`.

```bash
just db-push
```

Schreibt das Drizzle-Schema direkt in die lokale SQLite-Datenbank. Dieser Befehl kann interaktiv nach Bestaetigung fragen und ist deshalb nicht der Standardweg fuer Agenten oder CI.

```bash
just db-generate
just db-migrate
```

Erzeugt und spielt versionierte Drizzle-Migrationen ein. Das ist der bevorzugte Weg fuer reproduzierbare Schemaaenderungen.

```bash
just db-seed
```

Legt Standard-Verlaufsplanmodelle und Phasentypen an.

```bash
just preprocess-th
```

Liest `rawData/flp_th/download_manifest.json` und erzeugt normalisierte Lehrplan-Quellannotationen unter `data/preprocessed/`.

```bash
just db-import-th
just db-import
```

Erzeugt den Thueringen-Zwischenstand und importiert Lehrplanquellen sowie Gueltigkeitsregeln idempotent in SQLite.

```bash
just check
just test
just build
just verify
```

Prueft Typen, Unit-Tests und Produktionsbuild. `just verify` kombiniert `check`, `test` und `build`.

```bash
just studio
```

Startet Drizzle Studio fuer die lokale Datenbank.

```bash
just format
```

Formatiert den Code.

## Entsprechende npm-Befehle

```bash
npm install --legacy-peer-deps
npm run db:seed
npm run db:import:th
npm run dev
npm run check
npm test
npm run build
```

Bei Schemaaenderungen:

```bash
npm run db:generate
npm run db:migrate
```

## Anforderungen an neue Befehle

- Jeder Befehl muss idempotent sein, soweit sinnvoll.
- Fehlermeldungen muessen naechste Schritte nennen.
- Befehle duerfen keine Nutzerdaten loeschen.
- Befehle fuer Datenmigration und Preprocessing muessen Backups respektieren.
- LLM-Agenten sollen neue Automatisierungen zuerst hier dokumentieren und dann in der echten `justfile` umsetzen.
