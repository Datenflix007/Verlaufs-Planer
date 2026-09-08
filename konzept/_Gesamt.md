# Gesamtkonzept

## Kurzbeschreibung

Der Verlaufs-Planer ist eine Anwendung fuer Menschen, die Lernprozesse planen, durchfuehren und auswerten. Das Produkt verbindet klassische Verlaufsplaene mit Kompetenzplanung, Reihenplanung, Durchfuehrungsmodus, Reflexion und optionaler lokaler LLM-Unterstuetzung.

Die Anwendung soll drei Gruppen gleichzeitig verstaendlich bedienen:

- Stakeholder sollen erkennen, welchen Nutzen das Produkt stiftet und welche Anforderungen fachlich abgedeckt werden.
- Entwickler sollen erkennen, welche Module, Datenstrukturen und Schnittstellen benoetigt werden.
- LLM-Agenten sollen aus den Konzeptdateien konkrete, begrenzte Implementierungsaufgaben ableiten koennen.

## Problem

Unterrichts- und Workshopplanung ist haeufig auf viele Orte verteilt: Lehrplan-PDFs, private Notizen, Tabellen, Vorlagen, Materialordner, Timer und Reflexionsnotizen. Dadurch geht der Zusammenhang zwischen Ziel, Kompetenz, Methode, Phase, Material und spaeterer Beobachtung verloren.

Der Verlaufs-Planer soll diesen Zusammenhang herstellen. Eine geplante Stunde soll nicht nur eine Tabelle sein, sondern ein nachvollziehbarer didaktischer Datensatz.

## Produktziel

Nutzende sollen eine Lernsequenz von hinten nach vorne planen koennen:

1. Was sollen Lernende am Ende koennen, wissen oder zeigen?
2. Welche Kompetenzen und Lehrplanbezuege sind betroffen?
3. Welche Stunden oder Workshopteile fuehren dahin?
4. Welche Phasen, Methoden, Sozialformen und Materialien werden eingesetzt?
5. Was passiert in der Durchfuehrung tatsaechlich?
6. Welche Beobachtungen verbessern die naechste Planung?

## Zielgruppen

### Lehrkraefte

Lehrkraefte planen Unterrichtsreihen und Einzelstunden fuer Klassen, Kurse oder Lerngruppen. Sie benoetigen Kompetenzbezug, Reihenlogik, differenzierte Lernziele, Materialien und spaeter eine Reflexion der tatsaechlichen Durchfuehrung.

Wichtige Anforderungen:

- Reihenplanung ueber ein Schuljahr oder Unterrichtsvorhaben
- Einzelstunden aus einer Reihe ableiten
- Kompetenzschwerpunkte aus Fachlehrplaenen zuordnen
- Gueltigkeit und Inkraftsetzung von Fachlehrplaenen nach Schuljahr und Klassenstufe beruecksichtigen
- Phasen, Methoden, Lernziele und Materialien strukturiert planen
- PDF fuer Vorbereitung, Abgabe oder Archiv exportieren
- Notizen zur Durchfuehrung direkt am Plan erfassen

### Referierende und Fortbildende

Referierende planen Workshops, Studientage, Fortbildungen oder mehrtaegige Lernformate. Diese Zielgruppe braucht flexible Modelle, Zeitraster, Kompetenzrahmen und eine sichere lokale Nutzung.

Wichtige Anforderungen:

- eintagige und mehrtaegige Workshopplanung
- Kompetenzrahmen wie EU DigComp oder Erste-Hilfe-Kompetenzen abbilden
- Ablaufplaene fuer Praesenz-, Online- oder Hybridformate
- Durchfuehrungsmodus mit Timer oder manuellem Weiterklicken
- schnelle Anpassbarkeit an Zielgruppen und Rahmenbedingungen

### Fachleitungen, Seminarleitungen und Institutionen

Diese Gruppe braucht nachvollziehbare Qualitaet, Vergleichbarkeit und ggf. Vorlagen.

Wichtige Anforderungen:

- didaktische Modelle als Vorlagen hinterlegen
- gemeinsame Standardphasen und Planungslogiken
- Export und Dokumentation fuer Ausbildung, Feedback oder Qualitaetssicherung
- perspektivisch Netzwerkbetrieb fuer Teams

## Kernfunktionen

### 1. Verlaufsplaene erstellen

Ein Verlaufsplan besteht aus Metadaten, Zielen, Kompetenzen und Phasen. Phasen enthalten Zeit, didaktische Funktion, Methode, Sozialform, Material, Lehrkraftaktivitaet, Lernendenaktivitaet, erwartete Ergebnisse und optionale Hinweise.

### 2. Reihenplanung

Eine Reihenplanung buendelt mehrere Stunden oder Workshopmodule. Kompetenzschwerpunkte koennen auf Reihenebene geplant und auf Einzelstunden verteilt werden.

### 3. Eigene Verlaufsplan-Modelle

Nutzende koennen eigene Modelle anlegen. Ein Modell legt fest, welche Spalten, Phasenarten, Pflichtfelder und Auswertungslogiken ein Verlaufsplan verwendet. Standardmaessig sollen mindestens diese Modelle vorhanden sein:

- kommunikationsorientiertes Modell
- lernstandsorientiertes Modell

Details: [`MultipleVerlaufsplanModelle.md`](MultipleVerlaufsplanModelle.md)

### 4. Kompetenz-, Lehrplan- und Gueltigkeitsbezug

Rohdaten aus `rawData/` werden in eine normalisierte, annotierte Form ueberfuehrt. Dabei entstehen Kompetenzen, Inhaltsfelder, Jahrgangs-/Stufenbezuege, Faecher, Bundeslaender und Quellenverweise.

Wenn Fachlehrplaene auf der Quellseite Angaben zu Gueltigkeit oder Inkraftsetzung enthalten, muss die Anwendung diese Informationen erfassen. Nutzende sollen fuer ein konkretes Schuljahr und eine konkrete Klassenstufe erkennen koennen, welcher Lehrplan gueltig, neu in Kraft, auslaufend oder nur als Entwurfs-/Erprobungsfassung relevant ist.

Details: [`AnnotierteFLP.md`](AnnotierteFLP.md)

### 5. Durchfuehrungsmodus

Ein geplanter Verlauf kann live genutzt werden. Die Anwendung zeigt die aktuelle Phase, Zeit, Ziel, Methode, Material und Hinweise. Der Wechsel erfolgt wahlweise automatisch ueber Zeit oder manuell per Weiter-Aktion.

Im manuellen Modus sollen direkt Beobachtungen, Abweichungen und Reflexionsnotizen erfasst werden koennen.

### 6. Export

Verlaufsplaene sollen als PDF exportiert werden. Spaetere Exportziele koennen HTML, H5P, Arbeitsblaetter oder Materialpakete sein.

### 7. Lokale LLM-Unterstuetzung

Spaeter soll ein lokales LLM bei Planung und Reflexion helfen. Die Anwendung darf dabei keine sensiblen Daten ungefragt an externe Dienste senden.

Moegliche LLM-Funktionen:

- Phasenvorschlaege auf Basis von Ziel, Kompetenz und Lerngruppe
- Methodenvorschlaege
- Hinweise aus frueheren Reflexionsnotizen
- Materialentwuerfe
- Plausibilitaetspruefung: Passen Ziel, Kompetenz, Methode und Ergebnis zusammen?

## Ausrollbarkeit

Die Anwendung soll in drei Betriebsarten funktionieren.

### Lokal

Die Standardausfuehrung laeuft auf einem einzelnen Geraet. Daten liegen lokal in SQLite. Diese Betriebsart ist fuer Datenschutz, Entwicklung und schnelle Nutzung am wichtigsten.

### Netzwerk

Perspektivisch kann die Anwendung im lokalen Netzwerk laufen und ueber eine IPv4-Adresse erreichbar sein. Dann muessen Benutzerverwaltung, Zugriffsschutz, Backups und Sitzungen sauber umgesetzt sein.

### Web

Spaeter kann die Anwendung unter einer URL bereitgestellt werden. Dafuer muss das Datenmodell mandantenfaehig vorbereitet werden, auch wenn der erste MVP noch nicht zwingend echte Mandanten braucht.

## Nicht-Ziele fuer den ersten MVP

- kein vollstaendiges Lernmanagementsystem
- keine Schulverwaltungssoftware
- kein Ersatz fuer Moodle, itslearning oder IServ
- keine automatische rechtssichere Bewertung von Unterrichtsqualitaet
- keine ungepruefte automatische Lehrplaninterpretation ohne Quellenbezug
- keine externe KI-Pflicht

## Erfolgskriterien

Ein erster ernstzunehmender MVP ist erreicht, wenn eine Lehrkraft oder ein Referent:

1. ein Profil und einen Arbeitskontext anlegt,
2. ein Verlaufsplan-Modell auswaehlt,
3. eine Reihe oder Einzelstunde mit Lernzielen und Kompetenzen plant,
4. Phasen mit Zeiten, Methoden und Materialien erfasst,
5. den Plan als PDF exportiert,
6. den Plan im Durchfuehrungsmodus nutzt,
7. danach Reflexionsnotizen am Plan speichert.

## Leitprinzipien

- Didaktik zuerst, Technik als tragendes System.
- Offline-faehiger lokaler Start, spaeter erweiterbar fuer Netzwerk und Web.
- Jede automatische Empfehlung bleibt nachvollziehbar und bearbeitbar.
- Lehrplan- und Kompetenzdaten behalten Quellenangaben.
- Lehrplan-Gueltigkeit wird nicht geraten, sondern aus Quellmetadaten oder menschlich geprueften Angaben abgeleitet.
- Datenmodelle muessen stabile IDs, Migrationsfaehigkeit und Exportierbarkeit haben.
- UI muss Arbeitswerkzeug sein, keine Marketingoberflaeche.

## Offene Entscheidungen

- Welche zwei Standardmodelle werden exakt fachlich definiert?
- Welche Lehrplandaten sind rechtlich frei nutzbar und welche muessen nur lokal vom Nutzer importiert werden?
- Soll die erste Version nur Einzeluser koennen oder direkt mehrere Benutzer auf einem lokalen Server?
- Soll der PDF-Export zuerst ueber Browserdruck oder serverseitig ueber eine Render-Pipeline erfolgen?
- Welche lokalen LLM-Provider werden zuerst unterstuetzt?
