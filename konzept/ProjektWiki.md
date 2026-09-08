# Projektwiki

Dieses Verzeichnis ist die fachliche und technische Quelle fuer den Verlaufs-Planer. Jede Datei soll so geschrieben sein, dass Stakeholder, Entwickler und LLM-Agenten daraus dieselbe Produktlogik ableiten koennen.

## Lesereihenfolge

### Fuer Stakeholder

1. [`_Gesamt.md`](_Gesamt.md): Produktziel, Zielgruppen, Kernfunktionen
2. [`UI_UX_Konzept.md`](UI_UX_Konzept.md): wichtige Arbeitsablaeufe und Screens
3. [`Roadmap_MVP.md`](Roadmap_MVP.md): realistische Umsetzungsphasen

### Fuer Entwickler

1. [`TechnischeArchitektur.md`](TechnischeArchitektur.md): Stack, Module, Laufzeitmodell
2. [`Datenmodell.md`](Datenmodell.md): zentrale Entitaeten und Tabellen
3. [`AnnotierteFLP.md`](AnnotierteFLP.md): Import- und Annotationspipeline fuer Fachlehrplaene
4. [`BenutzerDatenManagement.md`](BenutzerDatenManagement.md): Auth, Rollen, Datenschutz, Backup
5. [`Justfile.md`](Justfile.md): erwartete Entwicklungs- und Betriebsbefehle

### Fuer LLM-Agenten

1. [`AgentenBriefing.md`](AgentenBriefing.md): Arbeitsregeln fuer Implementierungsagenten
2. [`Roadmap_MVP.md`](Roadmap_MVP.md): Aufgabenreihenfolge
3. [`Datenmodell.md`](Datenmodell.md): stabile Begriffe und IDs
4. [`TechnischeArchitektur.md`](TechnischeArchitektur.md): Grenzen zwischen Frontend, Backend und Datenbank

## Projektstruktur

```text
Verlaufs-Planer/
  README.md
  konzept/
    _Gesamt.md
    ProjektWiki.md
    TechnischeArchitektur.md
    Datenmodell.md
    UI_UX_Konzept.md
    MultipleVerlaufsplanModelle.md
    AnnotierteFLP.md
    BenutzerDatenManagement.md
    Justfile.md
    Roadmap_MVP.md
    AgentenBriefing.md
  rawData/
    euDigi/
    flp_bw/
    flp_bay/
    ...
```

## Begriffe

### Verlaufsplan

Ein strukturierter Plan fuer eine Stunde, ein Workshopmodul oder eine Lerneinheit. Er besteht aus Zielen, Kompetenzen, Phasen, Methoden, Materialien und Hinweisen.

### Phase

Ein zeitlich und didaktisch abgegrenzter Abschnitt innerhalb eines Verlaufsplans, zum Beispiel Einstieg, Erarbeitung, Sicherung, Transfer oder Reflexion.

### Reihenplanung

Eine zusammenhaengende Sequenz aus mehreren Stunden oder Modulen. Eine Reihe hat eigene Ziele, Kompetenzschwerpunkte und eine geplante Progression.

### Verlaufsplan-Modell

Eine Vorlage, die festlegt, wie ein Verlaufsplan aufgebaut ist. Modelle bestimmen Phasenarten, Spalten, Pflichtfelder, Reflexionsfelder und Exportlayout.

### Kompetenz

Eine fachliche, methodische, soziale, personale oder digitale Faehigkeit, die in Lehrplaenen oder Kompetenzrahmen beschrieben ist.

### Annotierter Fachlehrplan

Ein importierter Fachlehrplan, dessen Inhalte maschinenlesbar aufbereitet sind: Quelle, Bundesland, Fach, Jahrgang, Kompetenzbereich, Kompetenz, Inhaltsbezug und Textstelle.

## Dokumentationsregeln

- Fachliche Anforderungen werden immer aus Nutzersicht formuliert.
- Technische Anforderungen nennen konkrete Module, Datenstrukturen oder Schnittstellen.
- Unsichere Punkte werden als offene Entscheidung markiert.
- LLM-Agenten sollen keine nicht dokumentierten Grundsatzentscheidungen treffen.
- Neue zusammenhaengende Themen bekommen eine eigene Markdown-Datei unter `konzept/`.

## Definition of Done fuer Konzeptdateien

Eine Konzeptdatei ist gut genug, wenn sie:

- ihr Thema in einem Satz erklaert,
- relevante Nutzerrollen benennt,
- Daten oder UI-Elemente konkret beschreibt,
- technische Konsequenzen nennt,
- offene Entscheidungen sichtbar macht,
- Implementierungsaufgaben ableitbar macht.
