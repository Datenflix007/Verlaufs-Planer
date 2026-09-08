# Annotations-Datenvertrag

## Zweck

Der Annotations-Datenvertrag legt fest, wie Fachlehrplaene, Gueltigkeitsregeln, Kompetenzen und spaetere Klassenabdeckungen technisch beschrieben werden. Er ist die verbindliche Bruecke zwischen Preprocessing, SQLite, UI und LLM-Agenten.

## Grundsatz

Annotationen duerfen nicht nur Fliesstext sein. Jede annotierte Aussage braucht:

- stabile ID oder stabile Ableitungsregel
- Quelle und lokalen Pfad
- fachlichen Kontext: Bundesland, Schulform, Fach, Klassenstufe, Schuljahr
- Originaltext oder Fundstellenhinweis
- maschinenlesbaren Status
- menschlichen Reviewstatus

Wenn eine Information unsicher ist, wird Unsicherheit gespeichert. Sie wird nicht durch leere Felder oder stillschweigende Annahmen verdeckt.

## Ebenen

### Lehrplanquelle

Eine Lehrplanquelle beschreibt ein konkretes Dokument oder eine konkrete Fassung eines Dokuments.

Pflichtfelder:

- `jurisdiction`: zum Beispiel `TH`
- `schoolType`: Schulform aus dem Quellenkontext
- `subject`: Fachname
- `title`: sichtbarer Quellentitel
- `year`: Jahr aus Titel oder Metadaten, falls eindeutig
- `versionLabel`: sichtbare Fassungsbezeichnung
- `versionStatus`: `active`, `trial`, `draft`, `expired` oder `unknown`
- `sourceUrl`: Original-URL
- `localPath`: lokaler Pfad, falls heruntergeladen
- `reviewStatus`: `unreviewed`, `review_needed` oder `reviewed`
- `sourceMetadata`: technische Zusatzdaten aus Manifest oder Import

### Gueltigkeitsregel

Eine Gueltigkeitsregel beschreibt nicht den ganzen Lehrplan pauschal, sondern eine konkrete Aussage wie "im Schuljahr 2026/27 fuer Klassenstufen 6, 8, 9, 10".

Pflichtfelder:

- `ruleType`: `valid`, `effective` oder `expired`
- `schoolYear`: Schuljahr wie `2026/27`
- `gradeLevels`: Liste betroffener Klassenstufen
- `sourceText`: Originalausschnitt der Regel
- `confidence`: `low`, `medium` oder `high`

### Kompetenz

Eine Kompetenz beschreibt einen fachlichen Anspruch aus einer Quelle. Sie darf erst als belastbar gelten, wenn Fundstelle und Reviewstatus nachvollziehbar sind.

Pflichtfelder:

- `curriculumSourceId`
- `parentCompetencyId`, falls hierarchisch
- `code`, falls vorhanden
- `title`
- `description`
- `gradeFrom` und `gradeTo`, falls ableitbar
- `pageFrom` und `pageTo`, falls ableitbar
- `sourceQuote`
- `annotationStatus`: `draft`, `machine_prepared` oder `human_reviewed`
- `metadata`

### Klassenabdeckung

Eine Klassenabdeckung beschreibt, wann eine Klasse oder Lerngruppe eine Kompetenz bearbeitet hat.

Pflichtfelder:

- `classSubjectAllocationId`
- `competencyId`
- `lessonIds`
- `totalMinutes`
- `coverageLevel`: `introduced`, `practiced`, `secured` oder `assessed`
- `weeklyLessons`
- `weekRange`
- `hoverSummary`
- `manualNote`

Die Klassenuebersicht nutzt diese Daten fuer anklickbare Markierungen und Hover-Informationen. Hover zeigt mindestens Kompetenz, Wochenbereich, Stundenanzahl, Minuten oder Stundenumfang und Lernziele. Klick fuehrt zu den konkreten Stunden, Phasen und Notizen.

## Aktuelle technische Verankerung

Der TypeScript-Datenvertrag liegt in:

```text
src/lib/shared/annotation/curriculum.ts
```

Die SQLite-Tabellen liegen in:

```text
src/lib/server/db/schema.ts
```

Der Thueringen-Preprocess erzeugt aus dem Download-Manifest reproduzierbare Zwischenstaende:

```text
data/preprocessed/thuringia-curriculum-sources.json
```

Dieser Zwischenstand ist Arbeitsdatenbestand und wird nicht versioniert. Versioniert werden Code, Schema, Konzept und Rohdatenmanifest.

## Wiederverwendung

Der Vertrag muss stabil genug sein fuer:

- UI-Filter nach Schulform, Fach, Klassenstufe, Schuljahr und Gueltigkeit
- automatische Vorschlaege passender Lehrplanfassungen
- Kompetenzsuche und spaetere PDF-Annotation
- Klassenuebersicht mit Abdeckungsmarkierungen
- LLM-Agenten, die keine eigene Feldlogik erfinden sollen
- Export und Nachvollziehbarkeit gegenueber Stakeholdern

## Offene Entscheidungen

- Welche ID-Strategie wird fuer importierte Kompetenzen genutzt: Hash aus Quelle und Fundstelle oder UUID plus Importmapping?
- Wie fein werden Lehrplanseiten, Kapitel und Tabellenzellen referenziert?
- Ab wann gilt eine automatisch vorbereitete Kompetenz als gut genug fuer die Planung?
- Sollen widerspruechliche Gueltigkeitsregeln blockieren oder nur warnen?
