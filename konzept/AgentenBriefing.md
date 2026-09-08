# Agenten-Briefing

## Zweck

Diese Datei richtet sich an LLM-Agenten, die am Repository arbeiten. Sie beschreibt, wie Aufgaben interpretiert werden sollen, welche Dateien als Quelle gelten und welche Entscheidungen nicht stillschweigend geaendert werden duerfen.

## Quelle der Wahrheit

Konzeptuelle Quelle der Wahrheit ist `konzept/`.

Wichtige Dateien:

- `ProjektWiki.md`: Einstieg und Begriffe
- `_Gesamt.md`: Produktziel und Funktionsumfang
- `TechnischeArchitektur.md`: Stack und Module
- `Datenmodell.md`: Entitaeten und Beziehungen
- `Klassenuebersicht.md`: Klassen-, Wochenstunden- und Lehrplanabdeckungslogik
- `Roadmap_MVP.md`: Umsetzungsreihenfolge

## Technische Leitentscheidung

Standardannahme fuer Implementierungen:

- SvelteKit
- TypeScript
- SQLite
- Node-Laufzeit
- lokale Nutzung zuerst
- Netzwerk- und Webbetrieb spaeter vorbereiten

Agenten duerfen diese Grundentscheidung nicht ohne ausdruecklichen Auftrag ersetzen.

## Arbeitsregeln

- Vor Codeaenderungen relevante Konzeptdateien lesen.
- Bestehende Begriffe aus `Datenmodell.md` verwenden.
- Keine zweite, konkurrierende Architektur einfuehren.
- Neue Dateien nur anlegen, wenn sie eine klare Verantwortung haben.
- Tests ergaenzen, wenn Logik fuer Datenmodell, Validierung oder Export entsteht.
- Keine sensiblen Daten in Logs schreiben.
- LLM-Funktionen muessen optional bleiben.
- Externe Dienste nicht ungefragt voraussetzen.
- Gueltigkeit und Inkraftsetzung von Fachlehrplaenen duerfen bei Kompetenzsuche und Planung nicht ignoriert werden.
- Klassenuebersichten muessen Wochenstunden, Fachlehrplanfassung, Kompetenzschwerpunkte, Lernziele und Planungsbelege nachvollziehbar verbinden.
- Kompetenz- und Lernzielannotation aus `competencies` darf nur als geprueft behandelt werden, wenn `annotationStatus=human_reviewed` gesetzt ist.
- Wenn eine Quelle keine Kompetenzannotation besitzt, muss das als offene Aufgabe sichtbar bleiben und darf nicht durch frei erfundene Kompetenzlisten ersetzt werden.
- Der maschinenlesbare Review-Export enthaelt `workflow.complete` und `workflow.issues`. Agenten muessen diese Felder respektieren und duerfen eine Quelle nur dann als planungsbereit behandeln, wenn keine Workflow-Issues vorliegen.

## MVP-Fokus

Agenten sollen den End-to-End-Workflow priorisieren:

1. lokaler Start
2. Benutzer und Setup
3. Klasse oder Lerngruppe mit Fach und Wochenstunden anlegen
4. Modell auswaehlen
5. Stunde planen
6. Kompetenzen zuordnen
7. Klassenuebersicht und Lehrplanabdeckung aktualisieren
8. Phasen bearbeiten
9. PDF exportieren
10. Durchfuehrung starten
11. Reflexion speichern

## Naming

Empfohlene englische Codebegriffe:

- `Lesson`
- `LessonPhase`
- `Series`
- `ClassGroup`
- `ClassSubjectAllocation`
- `CurriculumCoverageMark`
- `PlanModel`
- `PlanModelVersion`
- `Competency`
- `CurriculumSource`
- `RunSession`
- `ReflectionNote`

Deutsche UI-Texte sollen fuer Nutzende verstaendlich bleiben:

- Stunde
- Phase
- Reihe
- Verlaufsplan-Modell
- Kompetenz
- Durchfuehrung
- Reflexion

## Keine stillen Annahmen

Bei diesen Punkten muessen Agenten Rueckfragen stellen oder eine offene Entscheidung dokumentieren:

- Wechsel des Frameworks
- Wechsel der Datenbank
- externe Cloud- oder KI-Pflicht
- Speicherung personenbezogener Daten ausserhalb der lokalen Instanz
- Entfernen der Modellversionierung
- rechtliche Bewertung von Lehrplandaten
- Annahmen zur Gueltigkeit eines Fachlehrplans, wenn Quelle oder Reviewstatus unklar sind
- automatische Markierung einer Kompetenz als behandelt, wenn kein Planungs- oder Durchfuehrungsbeleg existiert

## Erwartete Ergebnisqualitaet

Eine Implementierung ist nicht fertig, wenn nur eine UI-Maske existiert. Fertig bedeutet:

- Daten werden gespeichert und wieder geladen.
- Fehlerfaelle sind sichtbar.
- relevante Tests laufen.
- Start- und Entwicklungsbefehle sind dokumentiert.
- die Umsetzung widerspricht den Konzeptdateien nicht.
