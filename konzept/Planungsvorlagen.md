# Planungsvorlagen und Fachdisziplinen

## Zweck

Eine Planungsvorlage beschreibt den didaktischen Kontext einer neuen Planung. Sie ist ein Startpunkt: Sie schlägt Kompetenzrahmen, Layouts, Kapitel, Phasen, Methoden und Materialtypen vor, schränkt die Bearbeitung aber nicht ein.

Die Funktion richtet sich an Lehrende, Workshop-Leitende und Institutionen, die wiederkehrende Fach- oder Veranstaltungskontexte lokal bereitstellen möchten.

## Begriffs- und Datenmodell

`PlanningTemplate` und `CompetencyCatalog` sind bewusst getrennte Datenstrukturen.

```text
PlanningTemplate
  └─ competencyFrameworkIds ──referenziert──> CompetencyCatalog
                                               └─ CompetencyCategory -> CompetencyItem

WorkshopPlan
  ├─ settings.templateId
  ├─ settings.enabledCompetencyFrameworkIds
  └─ competencies[] (die tatsächlich ausgewählten Referenzen)
```

Eine Vorlage enthält deshalb niemals Kopien eines Kompetenzkatalogs. Das vermeidet auseinanderlaufende Fassungen und erlaubt mehreren Vorlagen, denselben Rahmen zu verwenden.

Die zentrale Schnittstelle befindet sich in `src/domain/types.ts`:

- `PlanningTemplate`: versionierte Vorlage mit referenzierten Rahmen und optionalen Empfehlungen.
- `LocalizedText`: deutschsprachiger Pflichtname, optionale englische Übersetzung.
- `PlanningSectionId`: IDs der vorhandenen Kapitel; sie steuern die sichtbare Gliederung.

Vorlagen verwenden stabile IDs. `schemaVersion` regelt das JSON-Format der Vorlage; `version` ist die fachliche Versionsnummer der Vorlage.

## Mitgelieferte Vorlagen

Mitgelieferte Dateien liegen datengetrieben unter `src/data/templates/`:

- `general.ts`: allgemeine Workshopplanung als flexibler Standard.
- `digital-humanities.ts`: Digital-Humanities-Vorlage mit DigComp 3.0.

Die UI liest sie ausschließlich über die Template-Registry. Weitere Disziplinen können daher ohne Änderungen an Komponenten ergänzt werden, etwa `geography.ts`, `history.ts` oder `computer-science.ts`.

Die Vorlage `digital-humanities` referenziert `eu-digcomp-3.0`, verwendet standardmäßig das Layout `workshop` und markiert acht DigComp-Kompetenzen als fachlich empfohlen. Die Markierung ist keine Filterung: Alle 21 DigComp-Kompetenzen bleiben sichtbar und auswählbar.

## Verhalten in der Anwendung

Beim Anlegen einer Planung wird eine Vorlage ausgewählt. Die Fabrik übernimmt ausschließlich deren Voreinstellungen:

- `templateId` und aktivierte Kompetenzrahmen,
- Standardlayout,
- verfügbare Layouts sowie Phasen- und Methodenvorschläge.

Es werden keine Kompetenzen als bereits ausgewählt gespeichert. Erst eine Aktion in der Kompetenzansicht erzeugt eine `CompetencyReference`.

Ein Wechsel der Vorlage erfolgt unter **Allgemeine Angaben → Planungsvorlage**. Er ergänzt die Rahmen der neuen Vorlage, entfernt aber weder bestehende Kompetenzreferenzen noch Lernziele, Phasen, Materialien oder Freitexte. Falls ein bisher verwendetes Layout nicht zur neuen Empfehlung gehört, bleibt es aus Gründen der Datenintegrität auswählbar.

Unter **Kompetenzen** erscheinen zunächst nur die zur Vorlage passenden Rahmen. **Weiteren Kompetenzrahmen hinzufügen** kann jederzeit einen weiteren mitgelieferten Rahmen aktivieren. Ein importierter Kompetenzkatalog wird ebenfalls nur für die aktuelle Planung aktiviert.

Unter **Einstellungen → Vorlagen** verwaltet die lokale Vorlagenbibliothek eigene Vorlagen. Aus einer Planung kann außerdem über **Als Vorlage speichern** eine reduzierte Vorlage entstehen. Übernommen werden Fach, tatsächlich verwendete Kompetenzbezüge, Layout und Kapitelstruktur; konkrete Termine, Zielgruppe, Freitexte und Verlaufszeilen werden nicht kopiert.

## Lokale Vorlagen

Eigene Vorlagen werden im Browser in `localStorage` unter `verlaufsplaner.planning-templates.v1` gespeichert. Der Speicherort ist absichtlich keine absolute Rechnerdatei:

```text
JSON-Datei auswählen
  -> Zod-Validierung von Form und Schema-Version
  -> Prüfung der Kompetenzrahmen- und Layout-IDs
  -> lokale Registrierung
```

Die Registry in `src/data/templates/registry.ts` stellt bereit:

- `getPlanningTemplates()`
- `getPlanningTemplate(id)`
- `registerLocalTemplate(template)`
- `removeLocalTemplate(id)`

Importierte Vorlagen dürfen keine unbekannten Kompetenzrahmen oder Layouts referenzieren. Solche Fehler werden vor dem Speichern verständlich abgebrochen. Mitgelieferte Vorlagen können nicht überschrieben oder gelöscht werden.

Der dateibasierte Import/Export ist absichtlich die erste Ausbaustufe. Eine Tauri- oder Electron-Version kann die Registry später durch einen Dateisystemadapter ergänzen, ohne `PlanningTemplate`, Validierung oder UI-Semantik zu ändern. Erst dann wären verwaltete lokale Vorlagenordner sinnvoll; Browser-Versionen speichern keine persistenten absoluten Pfade.

## Erweiterung durch Institutionen

Vorlagen können `organization` und `author` tragen. Damit können später etwa FSU Jena, ein Fachseminar oder eine Schule eigene, prüfbare Vorlagenpakete liefern. Eine Netzwerkintegration ist nicht Teil der lokalen Version; sie würde über einen weiteren Registry-Adapter erfolgen.

## Prüfregeln

- Die Vorlagen-ID besteht aus Kleinbuchstaben, Ziffern und Bindestrichen.
- Ein Standard-Kompetenzrahmen muss in `competencyFrameworkIds` enthalten sein.
- Ein Standardlayout muss in `scheduleLayoutIds` enthalten sein.
- Alle referenzierten Rahmen und Layouts müssen in den zentralen Registries existieren.
- `source.type` trennt mitgelieferte, lokale und importierte Vorlagen.

## Offene Erweiterungen

- Persistente eigene Kompetenzkataloge neben der aktuellen Sitzungsunterstützung.
- Paketformat `.verlaufsplan-template` mit optionalen Material- und Katalogabhängigkeiten.
- Institutionssignaturen und Versionsprüfungen für veröffentlichte Vorlagen.
