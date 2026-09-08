# Multiple Verlaufsplan-Modelle

## Zweck

Der Verlaufs-Planer darf nicht nur ein starres Tabellenformat koennen. Unterschiedliche didaktische Traditionen, Faecher, Institutionen und Workshopformate brauchen unterschiedliche Modelle. Deshalb werden Verlaufsplan-Modelle als Daten in der Anwendung gespeichert und nicht fest in der UI verdrahtet.

## Grundidee

Ein Verlaufsplan-Modell beschreibt:

- welche Felder ein Plan besitzt,
- welche Phasentypen angeboten werden,
- welche Spalten in der Phasentabelle sichtbar sind,
- welche Felder Pflichtfelder sind,
- wie ein PDF-Export aufgebaut ist,
- welche Reflexionsfragen nach der Durchfuehrung gestellt werden,
- welche Validierungen fuer Ziel, Kompetenz und Phase gelten.

## Standardmodelle

### Kommunikationsorientiertes Modell

Dieses Modell fokussiert Kommunikation, Interaktion und sprachliches Handeln.

Typische Felder:

- Kommunikationsziel
- Sprechanlass oder Problemstellung
- Sozialform
- Sprachliche Mittel
- Interaktionsform
- Ergebnissicherung
- Reflexion des Kommunikationsprozesses

Typische Phasen:

- Aktivierung
- Begegnung mit Anlass oder Material
- Erarbeitung
- Austausch
- Sicherung
- Transfer
- Reflexion

### Lernstandsorientiertes Modell

Dieses Modell fokussiert den Ausgangsstand der Lernenden und die geplante Lernprogression.

Typische Felder:

- Lernstand oder Diagnosehinweis
- Lernziel
- Kompetenzbezug
- Differenzierung
- Lernprodukt
- Ueberpruefung des Lernfortschritts
- Foerderhinweis

Typische Phasen:

- Diagnose oder Aktivierung
- Zielklaerung
- Aufbau
- Uebung
- Anwendung
- Sicherung
- Reflexion oder Ausblick

## Eigene Modelle

Nutzende sollen eigene Modelle anlegen, bearbeiten, duplizieren und archivieren koennen. Ein Modell kann privat oder perspektivisch fuer eine Organisation freigegeben sein.

Minimal benoetigte Funktionen:

- Modellname und Beschreibung erfassen
- Modell aus bestehender Vorlage duplizieren
- Phasentypen definieren
- Tabellenspalten definieren
- Pflichtfelder setzen
- Reihenfolge von Feldern und Spalten festlegen
- Standardwerte hinterlegen
- Exportlayout auswaehlen

## Technisches Modell

Ein Modell sollte versioniert gespeichert werden. Ein bestehender Verlaufsplan muss auch dann stabil bleiben, wenn die Vorlage spaeter geaendert wird.

Deshalb gilt:

- `plan_models` speichern die aktive Vorlage.
- `plan_model_versions` speichern unveraenderliche Versionen.
- Ein Verlaufsplan referenziert immer eine konkrete Modellversion.
- Aenderungen an einem Modell erzeugen eine neue Version.
- Bestehende Plaene werden nicht automatisch veraendert.

## Feldtypen

Mindestens folgende Feldtypen werden benoetigt:

- `text`: kurzer Text
- `textarea`: laengerer Text
- `number`: Zahl, zum Beispiel Minuten
- `select`: Auswahl aus festen Optionen
- `multi_select`: mehrere Optionen
- `competency_picker`: Bezug zu Kompetenzdaten
- `material_picker`: Bezug zu Material oder Artefakt
- `phase_type_picker`: Bezug zu Phasentypen
- `checkbox`: Ja/Nein-Feld
- `date`: Datum

## Phasentabelle

Eine Phase besteht nicht zwingend aus denselben Feldern wie jede andere Phase. Das Modell legt aber fest, welche Spalten im Editor und PDF erscheinen.

Empfohlene Standardspalten:

- Zeit
- Phase
- Ziel oder Teilziel
- Lehrkraftaktivitaet
- Lernendenaktivitaet
- Methode
- Sozialform
- Material
- Ergebnis
- Hinweise

## Validierung

Ein Modell kann Validierungsregeln definieren.

Beispiele:

- Jede Phase braucht eine Dauer.
- Jede Stunde braucht mindestens ein Lernziel.
- Jede Kompetenzzuordnung braucht eine Quelle.
- Die Summe der Phasendauern muss zur geplanten Gesamtdauer passen.
- Eine Sicherungsphase sollte ein erwartetes Ergebnis enthalten.

## UI-Anforderungen

Der Modelleditor soll kein technisches JSON-Formular sein. Nutzende brauchen eine sichtbare Vorschau:

- links: Modellstruktur und Felder
- mitte: editierbare Eigenschaften
- rechts: Vorschau eines Verlaufsplans
- unten: Validierungsfehler und Hinweise

## LLM-Unterstuetzung

Ein lokales LLM darf Vorschlaege machen, aber keine Modelle ungefragt ueberschreiben.

Moegliche Funktionen:

- aus einer vorhandenen Word- oder PDF-Vorlage ein Modell vorschlagen
- Pflichtfelder erkennen
- Phasentypen vorschlagen
- Exportbeschriftungen vereinheitlichen
- Modellvalidierung erklaeren

## Offene Entscheidungen

- Sollen Modelle importierbar und exportierbar sein, zum Beispiel als JSON?
- Welche Modellfelder sind fuer den ersten MVP zwingend?
- Wie stark darf ein Modell das PDF-Layout individualisieren?
