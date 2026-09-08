# Klassenuebersicht und Lehrplanabdeckung

## Zweck

Nutzende sollen pro Klasse oder Lerngruppe eine fachbezogene Uebersicht erhalten. Im Hintergrund liegt der jeweils passende Fachlehrplan fuer Schulform, Fach, Klassenstufe und Schuljahr. Die Uebersicht zeigt, wann mit wie vielen Wochenstunden welche Kompetenzschwerpunkte, Lernziele und Unterrichtsvorhaben geplant, begonnen, behandelt oder abgeschlossen wurden.

## Grundidee

Die Klassenuebersicht verbindet vier Ebenen:

- Klasse oder Lerngruppe
- Fach und Wochenstunden
- gueltiger Fachlehrplan fuer Klassenstufe und Schuljahr
- konkrete Reihen, Stunden, Kompetenzschwerpunkte und Lernziele

So entsteht eine fachliche Verlaufskarte: Lehrkraefte sehen nicht nur einzelne Stunden, sondern die Abdeckung des Fachlehrplans ueber ein Halbjahr oder Schuljahr.

## Nutzerfragen

Die Ansicht soll diese Fragen beantworten:

- Welche Fachlehrplanfassung gilt fuer diese Klasse, dieses Fach und dieses Schuljahr?
- Welche Kompetenzbereiche wurden bereits bearbeitet?
- Welche Kompetenzschwerpunkte sind geplant, aber noch nicht unterrichtet?
- Welche Lernziele wurden in welchen Wochen oder Stunden bearbeitet?
- Wie viele Wochenstunden standen fuer einen Schwerpunkt zur Verfuegung?
- Wo gibt es Luecken, Doppelungen oder unklare Abdeckung?
- Welche Unterrichtsstunden oder Reihen belegen eine Markierung?

## Zentrale Ansicht

Empfohlen ist eine kombinierte Uebersicht aus Lehrplanstruktur und Zeitachse.

### Kopfbereich

- Klasse oder Lerngruppe
- Schuljahr
- Schulform
- Klassenstufe
- Fach
- Wochenstunden
- aktive Fachlehrplanfassung
- Gueltigkeitsstatus der Fachlehrplanfassung

### Lehrplanbereich

Der Fachlehrplan wird als Hintergrundstruktur angezeigt:

- Kompetenzbereiche
- Kompetenzschwerpunkte
- Inhaltsfelder
- Lernbereiche
- ggf. Operatoren oder erwartete Lernprodukte

### Zeitbereich

Die Unterrichtszeit wird als Wochen-, Monats- oder Reihenansicht angezeigt.

Elemente:

- Kalenderwochen oder Unterrichtswochen
- geplante Reihen
- geplante Einzelstunden
- tatsaechlich durchgefuehrte Stunden
- Wochenstunden je Fach
- Ausfall-, Feiertags- oder Pufferhinweise perspektivisch

## Markierungen

Kompetenzschwerpunkte und Lernziele koennen markiert werden.

Markierungsstatus:

- `planned`: geplant
- `in_progress`: begonnen
- `covered`: behandelt
- `secured`: gesichert oder ueberprueft
- `reflected`: nach der Durchfuehrung reflektiert
- `gap`: geplante oder erkannte Luecke
- `unclear`: Zuordnung unsicher

Eine Markierung muss immer nachvollziehbar sein. Sie verweist auf mindestens einen Planungsbezug:

- Reihe
- Stunde
- Phase
- Lernziel
- Kompetenz
- Reflexionsnotiz

## Hover und Klick

Die Ansicht soll interaktiv sein.

### Hover

Beim Hover ueber eine Markierung zeigt die UI kompakt:

- Kompetenzschwerpunkt
- Lernziel oder Teilziel
- betroffene Woche oder Stunde
- geplante und tatsaechliche Wochenstunden
- zugehoerige Reihe oder Stunde
- Status der Lehrplan-Gueltigkeit

### Klick

Beim Klick oeffnet sich ein Detailpanel.

Das Detailpanel zeigt:

- vollstaendige Kompetenzformulierung mit Quelle
- zugeordnete Lernziele
- verknuepfte Stunden und Phasen
- geplante Dauer und tatsaechliche Dauer
- Reflexionsnotizen
- offene Folgeaufgaben
- Link zum Fachlehrplan-PDF oder zur lokalen Quelle

## Wochenstunden

Wochenstunden sollen nicht nur als statischer Wert im Klassenprofil stehen. Die App muss speichern koennen, wie viele Wochenstunden fuer ein Fach in einem Zeitraum geplant waren und wie viel Unterricht tatsaechlich stattgefunden hat.

Beispiele:

- Deutsch Klasse 6, Schuljahr 2026/27, 4 Wochenstunden
- Medienbildung und Informatik Klasse 5, erstes Halbjahr, 1 Wochenstunde
- Projektwoche mit abweichender Stundenlogik

## Planungsworkflow

1. Nutzer legt Klasse oder Lerngruppe an.
2. Nutzer waehlt Schuljahr, Schulform, Klassenstufe und Fach.
3. App ermittelt passende Fachlehrplanfassung und Gueltigkeitsstatus.
4. Nutzer traegt Wochenstunden ein.
5. Nutzer plant Reihen und Stunden.
6. Beim Zuordnen von Kompetenzen entstehen Markierungen in der Klassenuebersicht.
7. Nach Durchfuehrung werden Markierungen aktualisiert.
8. Reflexionsnotizen koennen Luecken oder Wiederholungsbedarf erzeugen.

## Validierung

Die App soll Hinweise geben, wenn:

- fuer die Klasse kein Fachlehrplan mit passender Gueltigkeit gefunden wurde,
- eine Kompetenz aus einer unpassenden Lehrplanfassung stammt,
- geplante Wochenstunden und geplante Unterrichtsdauer stark auseinanderfallen,
- ein Kompetenzschwerpunkt nie einer Reihe oder Stunde zugeordnet wurde,
- ein Lernziel ohne Kompetenzbezug bleibt,
- eine Markierung keinen nachvollziehbaren Planungsbezug hat.

## LLM-Unterstuetzung

Ein lokales LLM kann spaeter Hinweise aus der Klassenuebersicht ableiten:

- moegliche Luecken im Fachlehrplan
- Vorschlaege fuer Reihenfolge und Progression
- Wiederholungsbedarf aus Reflexionsnotizen
- Vorschlaege fuer Lernziele zu offenen Kompetenzschwerpunkten

LLM-Hinweise bleiben Vorschlaege. Die App darf daraus keine automatische Lehrplanabdeckung ohne Nutzerbestaetigung erzeugen.

## Technische Konsequenzen

Die Klassenuebersicht braucht eigene Datenstrukturen fuer:

- Klasse oder Lerngruppe
- Fachbelegung mit Wochenstunden
- Gueltige Fachlehrplanfassung
- Abdeckungsmarkierungen
- Verweise auf Reihen, Stunden, Phasen, Kompetenzen und Lernziele

Details stehen in [`Datenmodell.md`](Datenmodell.md).

## Offene Entscheidungen

- Soll die erste Version nur Schuljahresansicht oder auch Halbjahresansicht koennen?
- Sollen Wochen automatisch aus Kalenderdaten berechnet werden?
- Wie werden Ausfallstunden, Ferien und Feiertage abgebildet?
- Soll eine Kompetenz manuell als behandelt markiert werden duerfen, auch wenn keine Stunde verknuepft ist?
