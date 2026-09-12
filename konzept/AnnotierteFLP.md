# Annotierte Fachlehrplaene

## Zweck

Annotierte Fachlehrplaene verbinden Unterrichtsplanung mit verbindlichen Kompetenz- und Inhaltsbezugen. Die Anwendung soll Rohdaten aus `rawData/` in eine strukturierte Form ueberfuehren, damit Nutzende Kompetenzen suchen, filtern und einem Verlaufsplan zuordnen koennen.

## Aktuelle Rohdatenstruktur

Im Repository existiert `rawData/` mit Unterordnern fuer Bundeslaender und Kompetenzrahmen:

```text
rawData/
  euDigi/
  flp_bay/
  flp_ber/
  flp_bra/
  flp_bre/
  flp_bw/
  flp_he/
  flp_hh/
  flp_mv/
  flp_nrw/
  flp_rlp/
  flp_sa/
  flp_sar/
  flp_sh/
  flp_st/
  flp_th/
```

Die Ordner sind als Quellenbereiche zu verstehen. Die konkrete Dateibefuellung kann PDFs, HTML, Markdown, Textdateien oder strukturierte Daten enthalten.

## Zielstruktur

Jede importierte Kompetenz soll maschinenlesbar und quellenkritisch gespeichert werden.

Der verbindliche Feld- und Statusrahmen steht in [`AnnotationsDatenvertrag.md`](AnnotationsDatenvertrag.md). Preprocessing, SQLite-Schema, UI und spaetere LLM-Agenten muessen diesen Vertrag verwenden, statt eigene Feldnamen oder Statuswerte einzufuehren.

Minimal benoetigte Informationen:

- Quelle
- Bundesland oder Kompetenzrahmen
- Fach
- Schulform
- Jahrgangsstufe oder Lernstufe
- Kompetenzbereich
- Kompetenzformulierung
- Inhaltsbezug
- Originaltext oder Textauszug
- Fundstelle im Quelldokument
- Gueltigkeit, Inkraftsetzung oder Auslaufstatus nach Schuljahr und Klassenstufe
- Importdatum
- Lizenz- oder Nutzungshinweis, soweit bekannt

## Preprocessing-Pipeline

Der Befehl `just preprocess` soll diese Schritte ausfuehren:

1. Quellenordner scannen
2. Dateien erkennen
3. Text extrahieren
4. Metadaten erfassen
5. Gueltigkeits- und Inkraftsetzungsangaben aus Tabellen oder Begleittext erfassen
6. Inhalte normalisieren
7. Kompetenzen und Inhaltsfelder segmentieren
8. Quellenstellen speichern
9. Validierungsbericht erzeugen
10. Daten in SQLite schreiben oder als reproduzierbaren Zwischenstand ablegen

## Gueltigkeit und Inkraftsetzung

Fachlehrplaene koennen parallel gelistet sein, zum Beispiel ein bestehender Lehrplan und eine neue Erprobungsfassung. Die Quellseite kann pro Fach ausweisen, fuer welches Schuljahr und welche Klassenstufen eine Fassung gueltig ist oder neu in Kraft gesetzt wird.

Diese Informationen muessen strukturiert gespeichert werden, damit die Anwendung bei der Planung den passenden Stand vorschlagen kann.

Zu erfassen sind mindestens:

- Art der Angabe: `gueltigkeit`, `inkraftsetzung`, `entwurf`, `erprobung`, `auslaufend`, `unbekannt`
- Schuljahr, zum Beispiel `2026/27`
- betroffene Klassenstufen, zum Beispiel `5`, `6`, `11`, `12`
- Originaltext der Gueltigkeitsangabe
- Quelle der Angabe, zum Beispiel Tabellenzeile auf der Lehrplanseite
- Reviewstatus, wenn die Angabe automatisch extrahiert wurde

Planungslogik:

- Bei Auswahl von Bundesland, Schulform, Fach, Schuljahr und Klassenstufe soll die App gueltige Lehrplaene bevorzugt anzeigen.
- Wenn ein alter und ein neuer Lehrplan parallel relevant sind, zeigt die App beide mit Status und Begruendung.
- Entwurfs- und Erprobungsfassungen werden sichtbar gekennzeichnet.
- Wenn keine Gueltigkeitsdaten vorliegen, wird das als Unsicherheit angezeigt und nicht stillschweigend als gueltig behandelt.

## Annotationsebenen

### Dokumentebene

- Bundesland
- Fach
- Schulform
- Herausgeber
- Erscheinungsjahr
- URL oder lokaler Pfad
- Lizenzstatus
- Gueltigkeits- und Inkraftsetzungshinweise

### Abschnittsebene

- Kapitel
- Kompetenzbereich
- Inhaltsfeld
- Jahrgang oder Stufe
- Seiten- oder Abschnittsreferenz

### Kompetenzebene

- Kompetenztext
- Operatoren
- fachliche Konzepte
- methodische Anforderungen
- digitale Bezuege
- moegliche Lernprodukte

### Manueller Review-MVP

Der aktuelle MVP beginnt mit manueller Kompetenzannotation direkt in der Lehrplan-Detailansicht unter `/curriculum/[id]`. Reviewer koennen fuer eine Quelle Kompetenzschwerpunkte, Lernzielbezuege oder Inhaltsfelder erfassen und dabei Code, Klassenstufenbereich, Seitenbereich, Fundtext und Annotationsstatus speichern.

Diese Eintraege sind keine Ersatzquelle. Sie sind strukturierte Arbeitsdaten, die immer auf die Lehrplanquelle und moeglichst auf eine konkrete Seite oder einen Originalausschnitt verweisen. Ohne `human_reviewed` duerfen sie spaeter im Kompetenzbrowser nur als Entwurf oder Reviewbedarf erscheinen.

Die Review-Liste zeigt dafuer einen Arbeitsstatus. Eine Quelle bleibt offen, solange Quellenreview, Gueltigkeitsregeln, Kontextgueltigkeit oder menschlich gepruefte Kompetenzannotation fehlen. Dadurch kann die fachliche Pruefung als Queue abgearbeitet werden, ohne dass Luecken im Datenbestand unsichtbar werden.

Fuer LLM-Agenten gilt:

- keine Kompetenzen erfinden, wenn in `competencies` kein Eintrag vorliegt
- maschinell vorbereitete Vorschlaege nur mit `annotationStatus=machine_prepared` schreiben
- menschlich gepruefte Eintraege nicht ueberschreiben, sondern neue Vorschlaege als Entwurf danebenlegen
- fehlende Kompetenzannotation als offene Aufgabe melden

## Quellenkritik

Die Anwendung darf Lehrplandaten nicht so behandeln, als waeren sie automatisch korrekt. Importierte Daten brauchen Validierungsstatus.

Empfohlene Statuswerte:

- `raw`: Quelle liegt vor, aber wurde noch nicht verarbeitet.
- `extracted`: Text wurde extrahiert.
- `annotated_auto`: automatische Annotation liegt vor.
- `review_needed`: menschliche Pruefung noetig.
- `reviewed`: menschlich geprueft.
- `deprecated`: Quelle ist veraltet oder ersetzt.

## Suche und Nutzung in der Anwendung

Nutzende sollen Kompetenzen filtern koennen nach:

- Bundesland
- Fach
- Schulform
- Jahrgang
- Schuljahr
- Gueltigkeitsstatus
- Kompetenzbereich
- Stichwort
- Quelle

Beim Auswaehlen wird die Kompetenz mit Quelle und Gueltigkeitskontext in den Plan uebernommen. Wenn der Plan ein Schuljahr oder eine Klassenstufe besitzt, muss die App anzeigen, ob die Kompetenz aus einem fuer diesen Kontext passenden Lehrplan stammt.

## LLM-Unterstuetzung

Ein lokales LLM kann spaeter helfen, Kompetenzen vorzuschlagen oder Quelltexte zu strukturieren. LLM-Ausgaben sind aber nicht automatisch Quellenwahrheit.

Regeln:

- LLM-Vorschlaege muessen als Vorschlag markiert werden.
- Quellenzitate und Fundstellen duerfen nicht erfunden werden.
- Bei Unsicherheit wird `review_needed` gesetzt.
- Der Originaltext bleibt abrufbar.

## Technische Umsetzung

Empfohlen ist eine Preprocessing-Schicht, die getrennt von der UI laeuft. Sie kann in TypeScript umgesetzt werden, damit sie denselben Datenzugriff wie die App nutzt. Falls PDF-Extraktion in TypeScript unzuverlaessig ist, kann ein kleines Python-Hilfsmodul eingesetzt werden. Die erzeugten Daten muessen trotzdem ueber klar definierte JSON-Zwischenformate oder Datenbanktabellen in die App gelangen.

## Offene Entscheidungen

- Welche Lehrplaene duerfen direkt mit dem Projekt ausgeliefert werden?
- Welche Quellen muessen Nutzende selbst lokal importieren?
- Soll der MVP zuerst nur ein Bundesland und ein Fach sauber abbilden?
- Welche Felder sind fuer die erste Kompetenzsuche zwingend?
- Wie werden widerspruechliche oder mehrdeutige Gueltigkeitsangaben aus Quellseiten menschlich geprueft?
