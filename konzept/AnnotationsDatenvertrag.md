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
- `reviewNote`: menschliche Notiz zur Pruefung, Gueltigkeit oder offenen Frage
- `reviewedAt`: Zeitstempel der letzten positiven Pruefung
- `sourceMetadata`: technische Zusatzdaten aus Manifest oder Import

### Gueltigkeitsregel

Eine Gueltigkeitsregel beschreibt nicht den ganzen Lehrplan pauschal, sondern eine konkrete Aussage wie "im Schuljahr 2026/27 fuer Klassenstufen 6, 8, 9, 10".

Pflichtfelder:

- `ruleType`: `valid`, `effective` oder `expired`
- `schoolYear`: Schuljahr wie `2026/27`
- `gradeLevels`: Liste betroffener Klassenstufen
- `sourceText`: Originalausschnitt der Regel
- `origin`: `imported` fuer maschinell vorbereitete Regeln oder `manual` fuer menschlich erfasste Regeln
- `confidence`: `low`, `medium` oder `high`

Manuelle Regeln muessen beim erneuten Import erhalten bleiben. Der Import darf nur Regeln mit `origin=imported` ersetzen.

Fuer den Review-Workflow muss eine Quelle nach Klassenstufe und Schuljahr filterbar sein. Eine Quelle gilt fuer einen konkreten Kontext als passend, wenn mindestens eine Gueltigkeitsregel die gewuenschte Klassenstufe trifft und das Schuljahr im Regelbereich liegt. Ohne `validToSchoolYear` wird konservativ nur das angegebene `schoolYear` als Treffer gewertet.

Die Detailansicht muss die aktiven Filter aus der Review-Liste beibehalten. Dadurch entsteht eine stabile Review-Queue: vorherige Quelle, naechste Quelle und naechste offene Quelle beziehen sich immer auf dieselben Filterbedingungen.

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

Der erste Review-Workflow speichert Kompetenz- und Lernzielannotation direkt an der Lehrplanquelle in `competencies`. Manuell erfasste Eintraege nutzen `metadata.origin=manual_review_form`. Ein Eintrag kann ein Kompetenzschwerpunkt, ein konkretes Lernziel oder ein strukturierter Inhaltsbezug sein, solange Titel, Fundstelle und Kontext nachvollziehbar bleiben.

Statuslogik:

- `draft`: menschlich oder technisch notiert, aber noch nicht belastbar
- `machine_prepared`: automatisch vorbereitet und offen fuer Review
- `human_reviewed`: von einem Menschen gegen Quelle und Fundstelle geprueft

Eine Lehrplanquelle ohne Kompetenzannotation darf im Kompetenzbrowser spaeter nicht als voll verwendbar erscheinen. UI und Export muessen diesen Zustand als offene Annotation anzeigen.

### Workflow-Vollstaendigkeit

Der Review-Workflow berechnet pro Lehrplanquelle einen Arbeitsstatus. Eine Quelle ist erst vollstaendig, wenn:

- `reviewStatus=reviewed` gesetzt ist
- mindestens eine Gueltigkeitsregel vorhanden ist
- bei gesetztem Schuljahr-/Klassenstufen-Kontext mindestens eine Gueltigkeitsregel diesen Kontext trifft
- mindestens eine Kompetenz- oder Lernzielannotation vorhanden ist
- mindestens eine Kompetenzannotation `annotationStatus=human_reviewed` besitzt

Offene Punkte werden maschinenlesbar als `workflow.issues` gefuehrt:

- `review_needed`
- `missing_validity_rules`
- `missing_context_validity`
- `missing_competencies`
- `competency_review_needed`

Die Review-Liste darf nach diesen Zustaenden filtern. `nextOpen` in der Review-Queue meint nicht nur "Quelle nicht geprueft", sondern jede Quelle, deren Workflow noch nicht vollstaendig ist.

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

Der maschinenlesbare Review-Export liegt standardmaessig unter:

```text
data/exports/curriculum-review.json
```

Der Export nutzt `schemaVersion=curriculum-review-export/v1` und enthaelt mindestens `stats`, `openIssues` und `sources`. Jede Quelle enthaelt ihre `validity.rules`, `competencySummary`, `competencies` und `workflow`. Agenten duerfen daraus Review-Luecken, Gueltigkeitsregeln und Kompetenzannotation ableiten, muessen aber `openIssues`, `workflow.issues`, `review.status` und `competencies[].annotationStatus` sichtbar lassen. Fehlende Gueltigkeit oder fehlende Kompetenzannotation darf nicht als bestaetigt behandelt werden.

## Offene Entscheidungen

- Welche ID-Strategie wird fuer importierte Kompetenzen genutzt: Hash aus Quelle und Fundstelle oder UUID plus Importmapping?
- Wie fein werden Lehrplanseiten, Kapitel und Tabellenzellen referenziert?
- Ab wann gilt eine automatisch vorbereitete Kompetenz als gut genug fuer die Planung?
- Sollen widerspruechliche Gueltigkeitsregeln blockieren oder nur warnen?
