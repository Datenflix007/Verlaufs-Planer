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
- Importdatum
- Lizenz- oder Nutzungshinweis, soweit bekannt

## Preprocessing-Pipeline

Der Befehl `just preprocess` soll diese Schritte ausfuehren:

1. Quellenordner scannen
2. Dateien erkennen
3. Text extrahieren
4. Metadaten erfassen
5. Inhalte normalisieren
6. Kompetenzen und Inhaltsfelder segmentieren
7. Quellenstellen speichern
8. Validierungsbericht erzeugen
9. Daten in SQLite schreiben oder als reproduzierbaren Zwischenstand ablegen

## Annotationsebenen

### Dokumentebene

- Bundesland
- Fach
- Schulform
- Herausgeber
- Erscheinungsjahr
- URL oder lokaler Pfad
- Lizenzstatus

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
- Kompetenzbereich
- Stichwort
- Quelle

Beim Auswaehlen wird die Kompetenz mit Quelle in den Plan uebernommen.

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
