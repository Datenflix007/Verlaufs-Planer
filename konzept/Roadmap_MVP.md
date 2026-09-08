# Roadmap und MVP

## Ziel

Die Roadmap priorisiert eine Version, die real nutzbar ist. Der erste MVP soll nicht alle spaeteren Ideen enthalten, aber den Kernworkflow Ende-zu-Ende abbilden.

## MVP-Leitsatz

Eine Person kann lokal eine Stunde planen, Kompetenzen zuordnen, Phasen strukturieren, als PDF exportieren, live durchfuehren und danach reflektieren.

## Phase 0: Projektgrundlage

Ergebnis:

- SvelteKit- und TypeScript-Projekt initialisiert
- SQLite angebunden
- Migrationen eingerichtet
- justfile angelegt
- Basistests laufen
- Standardlayout und Navigation stehen

Akzeptanzkriterien:

- `just install`, `just dev`, `just test` funktionieren
- Startseite oeffnet die Anwendung
- leere lokale Datenbank kann erstellt werden

## Phase 1: Benutzer und Setup

Ergebnis:

- lokales Benutzerkonto
- Login und Logout
- erste Setup-UI
- Auswahl von Bundesland, Fach, Schulform und Standardmodell

Akzeptanzkriterien:

- erster Benutzer wird als `owner` angelegt
- Login schuetzt die Planungsbereiche
- Einstellungen werden gespeichert

## Phase 2: Verlaufsplan-Modelle

Ergebnis:

- Standardmodelle als Seed-Daten
- Modellversionen
- Phasentypen
- einfache Modellvorschau

Akzeptanzkriterien:

- kommunikationsorientiertes Modell existiert
- lernstandsorientiertes Modell existiert
- neue Stunde referenziert eine Modellversion

## Phase 3: Stundeneditor

Ergebnis:

- Einzelstunde anlegen
- Lernziel und erwartetes Ergebnis erfassen
- Phasen bearbeiten
- Zeiten validieren
- Notizen speichern

Akzeptanzkriterien:

- Stunde kann erstellt, bearbeitet und wieder geladen werden
- Phasen koennen sortiert werden
- Zeitabweichung wird sichtbar

## Phase 4: Kompetenzdaten

Ergebnis:

- einfache Kompetenzdatenstruktur
- manuell gepflegte oder vorbereitete Beispielkompetenzen
- Gueltigkeitsdaten fuer Fachlehrplaene nach Schuljahr und Klassenstufe
- Kompetenzbrowser
- Zuordnung zur Stunde

Akzeptanzkriterien:

- Kompetenzen koennen gesucht und gefiltert werden
- Kompetenzen und Lehrplaene koennen nach Schuljahr, Klassenstufe und Gueltigkeitsstatus gefiltert werden
- Kompetenz wird mit Quelle am Plan gespeichert
- Plan zeigt Warnung, wenn die gewaehlte Lehrplanfassung fuer Schuljahr oder Klassenstufe nicht eindeutig passt
- Stunde zeigt zugeordnete Kompetenzen

## Phase 5: Reihenplanung

Ergebnis:

- Reihe anlegen
- Stunden einer Reihe zuordnen
- Kompetenzschwerpunkte auf Reihenebene
- einfache Reihenuebersicht

Akzeptanzkriterien:

- Reihe kann mehrere Stunden enthalten
- Stundenreihenfolge ist bearbeitbar
- Fortschritt der Reihe ist sichtbar

## Phase 6: Export

Ergebnis:

- druckfaehige Planansicht
- PDF-Export einer Stunde
- optional Export einer Reihe

Akzeptanzkriterien:

- PDF enthaelt Kopf, Ziele, Kompetenzen und Phasen
- lange Texte brechen sauber um
- Export ist aus der UI erreichbar

## Phase 7: Durchfuehrungsmodus und Reflexion

Ergebnis:

- Durchfuehrungsmodus fuer eine Stunde
- manuelles Weiterklicken
- optional Timer
- Notizen waehrend der Durchfuehrung
- Reflexionsansicht danach

Akzeptanzkriterien:

- aktuelle Phase ist gut lesbar
- Notizen werden gespeichert
- Zeitabweichungen koennen dokumentiert werden

## Nach dem MVP

Moegliche Erweiterungen:

- automatische Lehrplan-Annotation aus Rohdaten
- lokales LLM fuer Vorschlaege
- Arbeitsblattgenerator
- HTML- und H5P-Export
- Tauri-Desktop-App
- Netzwerkbetrieb
- Webbetrieb mit Mandanten
- gemeinsame Modellbibliothek

## Risiken

- Lehrplandaten koennen rechtlich oder strukturell schwierig sein.
- Gueltigkeitsangaben koennen je Fach, Schuljahr und Klassenstufe unterschiedlich sein und brauchen Reviewstatus.
- Modellflexibilitaet kann UI und Datenmodell ueberfrachten.
- PDF-Export ist oft aufwendiger als geplant.
- Lokale LLMs sind optional und duerfen den MVP nicht blockieren.

## Priorisierung

Wenn Zeit knapp ist, gilt diese Reihenfolge:

1. Datenmodell und Migrationen
2. Stundeneditor
3. Modellversionen
4. PDF-Export
5. Durchfuehrungsmodus
6. Reihenplanung
7. Kompetenzbrowser
8. LLM-Unterstuetzung
