# Verlaufs-Planer

Der Verlaufs-Planer ist ein Open-Source-Projekt fuer die Planung, Durchfuehrung und Auswertung von Unterricht, Workshops und mehrteiligen Lernreihen.

Die Anwendung soll Verlaufsplaene nicht nur als Tabelle abbilden, sondern als didaktisches Planungssystem: Ziele, Kompetenzen, Unterrichtsphasen, Methoden, Materialien, Notizen und spaetere Reflexionen sollen zusammenhaengend gepflegt werden.

Der aktuelle Projektstand ist eine Konzept- und Planungsbasis. Die fachlichen und technischen Anforderungen liegen unter [`konzept/`](konzept/ProjektWiki.md).

## Zielbild

- Planung von Einzelstunden, Workshops und Reihenplanungen
- frei definierbare Verlaufsplan-Modelle
- Standardmodelle fuer kommunikationsorientierte und lernstandsorientierte Planung
- Kompetenzbezug zu Fachlehrplaenen und externen Kompetenzrahmen wie DigComp
- PDF-Export und Durchfuehrungsmodus
- lokale Nutzung mit SQLite
- spaetere Netzwerk- und Web-Ausrollung
- optionale lokale LLM-Unterstuetzung fuer Vorschlaege, Reflexion und Materialideen

## Datenquellen

Die Fachlehrplaene fuer Thueringen folgen dem Thueringer Schulportal: <https://schulportal-thueringen.de/lehrplaene>.

## Entwicklung

Der MVP ist als SvelteKit-/TypeScript-Anwendung mit lokaler SQLite-Datenbank angelegt. Die wichtigsten Befehle sind in der `justfile` im Repository-Root gebuendelt.

```bash
just bootstrap
just dev
just verify
```

Falls `just` nicht installiert ist, funktionieren die entsprechenden npm-Befehle direkt:

```bash
npm install --legacy-peer-deps
npm run db:seed
npm run db:import:th
npm run dev
npm run check
npm test
npm run build
```

Wenn das Datenbankschema geaendert wurde, wird vorher eine Migration erzeugt:

```bash
npm run db:generate
```

Die lokale Datenbank liegt standardmaessig unter `data/verlaufs-planer.sqlite`. `npm run db:import:th` erzeugt den Thueringen-Zwischenstand unter `data/preprocessed/` und importiert die Lehrplanquellen in SQLite.

Die erste Review-Ansicht ist unter `/curriculum` erreichbar, sobald die App lokal laeuft.

## Empfohlener Einstieg

1. [`konzept/ProjektWiki.md`](konzept/ProjektWiki.md) lesen.
2. [`konzept/_Gesamt.md`](konzept/_Gesamt.md) fuer Produktziel und Stakeholder lesen.
3. [`konzept/TechnischeArchitektur.md`](konzept/TechnischeArchitektur.md) fuer Stack, Module und Laufzeitmodell lesen.
4. [`konzept/Roadmap_MVP.md`](konzept/Roadmap_MVP.md) fuer die erste umsetzbare Version lesen.
