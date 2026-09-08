# UI- und UX-Konzept

## Ziel

Die Anwendung soll sich wie ein Arbeitswerkzeug fuer Planung anfuehlen: klar, dicht, schnell und nachvollziehbar. Die erste Ansicht soll kein Marketing sein, sondern direkt in die Planung fuehren.

## Grundprinzipien

- Nutzer sollen immer wissen, ob sie eine Reihe, eine Stunde, ein Modell oder eine Quelle bearbeiten.
- Planung soll sowohl vorwaerts als auch rueckwaerts funktionieren.
- Lernziele, Kompetenzen und erwartete Ergebnisse sollen sichtbar miteinander verbunden sein.
- Tabellen duerfen komplex sein, muessen aber ruhig und scanbar bleiben.
- Der Durchfuehrungsmodus muss auf Distanz und unter Zeitdruck lesbar sein.

## Hauptnavigation

Empfohlene Bereiche:

- Dashboard
- Klassen
- Reihen
- Stunden
- Modelle
- Kompetenzen
- Materialien
- Durchfuehrung
- Auswertung
- Einstellungen

## Dashboard

Das Dashboard zeigt keine Werbetexte, sondern Arbeitszustand.

Elemente:

- zuletzt bearbeitete Plaene
- naechste geplante Durchfuehrungen
- offene Reflexionsnotizen
- aktive Reihen
- Klassen mit offenen Kompetenzluecken oder unklarer Lehrplanabdeckung
- Schnellaktion: neue Stunde
- Schnellaktion: neue Reihe
- Schnellaktion: Durchfuehrungsmodus starten

## Setup

Beim ersten Start wird ein kurzer Setup-Assistent angezeigt.

Schritte:

1. Benutzerkonto anlegen
2. Betriebsart bestaetigen: lokal
3. Bundesland auswaehlen
4. Schulform und Faecher auswaehlen
5. Kompetenzrahmen aktivieren, zum Beispiel EU DigComp
6. Standardmodell waehlen

## Reihenplanung

Die Reihenplanung soll die Progression sichtbar machen.

Ansicht:

- Kopfleiste mit Titel, Fach, Lerngruppe, Zeitraum
- Kompetenzschwerpunkte der Reihe
- Stundenliste als Timeline oder Tabelle
- Status je Stunde: Entwurf, geplant, durchgefuehrt, reflektiert
- Hinweise aus frueheren Reflexionen

Nutzeraktionen:

- Stunde hinzufuegen
- Stunde duplizieren
- Kompetenzschwerpunkt zuordnen
- Reihenfolge aendern
- PDF fuer Reihe exportieren

## Klassenuebersicht

Die Klassenuebersicht ist eine fachbezogene Planungs- und Kontrollansicht fuer eine Klasse oder Lerngruppe.

Kopfbereich:

- Klasse oder Lerngruppe
- Schuljahr
- Schulform
- Klassenstufe
- Fach
- Wochenstunden
- gueltige Fachlehrplanfassung
- Gueltigkeitsstatus der Fachlehrplanfassung

Hauptbereich:

- links oder oben: Fachlehrplanstruktur mit Kompetenzbereichen und Kompetenzschwerpunkten
- rechts oder unten: Zeitachse nach Wochen, Monaten, Reihen oder Stunden
- Markierungen zeigen, wann Kompetenzschwerpunkte und Lernziele geplant, begonnen, behandelt, gesichert oder reflektiert wurden

Interaktion:

- Hover ueber eine Markierung zeigt Kompetenzschwerpunkt, Lernziel, Woche, Wochenstunden, Reihe/Stunde und Quelle.
- Klick auf eine Markierung oeffnet ein Detailpanel mit Fachlehrplantext, verknuepften Reihen, Stunden, Phasen und Reflexionsnotizen.
- Klick auf einen offenen Kompetenzschwerpunkt kann eine neue Reihe oder Stunde mit diesem Bezug vorbereiten.

Die Ansicht soll Warnungen zeigen, wenn Wochenstunden, geplante Dauer und Lehrplanabdeckung nicht zusammenpassen oder wenn ein Fachlehrplan fuer Schuljahr und Klassenstufe nicht eindeutig gueltig ist.

## Stundeneditor

Der Stundeneditor ist der Kernscreen.

Empfohlene Bereiche:

- Kopfbereich: Titel, Dauer, Datum, Kontext
- Zielbereich: Lernziel, erwartetes Ergebnis, Kompetenzbezug
- Phasentabelle: Zeiten, Phasen, Aktivitaeten, Methoden, Material
- Seitenbereich: Kompetenzbrowser, Materialien, LLM-Vorschlaege, Notizen
- Validierungsleiste: fehlende Pflichtfelder, Zeitabweichungen, Modellhinweise

## Rueckwaertsplanung

Der Editor soll bewusst erlauben, von Ergebnis und Lernziel aus zu planen.

Workflow:

1. Erwartetes Ergebnis formulieren.
2. Lernziel ableiten.
3. Kompetenzen zuordnen.
4. Nachweise oder Lernprodukte festlegen.
5. Phasen planen, die zu diesem Ergebnis fuehren.

## Kompetenzbrowser

Der Kompetenzbrowser ist eine filterbare Seitenansicht oder ein eigener Screen.

Filter:

- Bundesland
- Fach
- Schulform
- Jahrgang
- Schuljahr
- Gueltigkeitsstatus
- Kompetenzbereich
- Stichwort
- Quelle

Beim Auswaehlen wird die Kompetenz mit Quelle in den Plan uebernommen.

Gueltigkeitsanzeige:

- gueltig fuer den aktuellen Planungskontext
- neu in Kraft ab einem bestimmten Schuljahr
- auslaufend fuer bestimmte Klassenstufen
- Entwurfs- oder Erprobungsfassung
- Gueltigkeit unbekannt

Wenn Schuljahr, Klassenstufe und Lehrplanfassung nicht zusammenpassen, muss die UI warnen, aber die Auswahl nicht hart blockieren. Nutzende sollen fachlich begruendet trotzdem mit abweichenden Quellen planen koennen.

## Durchfuehrungsmodus

Der Durchfuehrungsmodus muss fokussiert und robust sein.

Anzeige:

- aktuelle Phase
- verbleibende Zeit
- Ziel der Phase
- Lehrkraftaktivitaet
- Lernendenaktivitaet
- Material
- naechste Phase
- Notizfeld

Modi:

- automatisch zeitgesteuert
- manuell per Weiter-Aktion

Notizen:

- Zeit passte nicht
- Methode funktionierte gut
- Lerngruppe brauchte mehr Unterstuetzung
- Material fehlte oder war ungeeignet
- Idee fuer naechstes Mal

## Modellverwaltung

Die Modellverwaltung erlaubt Vorlagenpflege ohne Programmierung.

Ansichten:

- Modellliste
- Modelleditor
- Vorschau
- Versionshistorie

Wichtig: Aenderungen an Modellen duerfen bestehende Plaene nicht unbemerkt veraendern.

## Auswertung

Nach einer Durchfuehrung soll die App Reflexion strukturiert erfassen.

Fragen:

- Welche Phasen dauerten laenger oder kuerzer?
- Wurde das Lernziel erreicht?
- Welche Kompetenz wurde sichtbar bearbeitet?
- Was muss beim naechsten Mal angepasst werden?
- Welche Notiz soll spaeter als Planungshinweis erscheinen?

## Barrierearmut und Bedienbarkeit

- Tastaturbedienung fuer Tabellen und Formulare
- klare Fokuszustaende
- ausreichend Kontrast
- keine winzigen Touch-Ziele im Durchfuehrungsmodus
- Druckansicht ohne verdeckte Inhalte
- responsive Layouts fuer Notebook, Tablet und Beamer

## Offene Entscheidungen

- Soll der Stundeneditor primaer tabellarisch oder blockbasiert sein?
- Soll der Durchfuehrungsmodus auch offline im Browsercache funktionieren?
- Wie stark soll Drag-and-drop im MVP genutzt werden?
