# Architektur des Verlaufsplaners

Stand: 25. September 2026

## Ausgangslage

Der aktuelle Branch enthielt bei Arbeitsbeginn **keine lauffaehige Webanwendung**: kein `package.json`, kein `src/`, keine Stores, keine Routen und keine Persistenz. Er enthielt eine README und fachliche Konzeptdokumente unter `konzept/`. Daher gibt es keine aktive Studienverlaufslogik oder alte UI-Komponenten, die migriert oder weiterverwendet werden koennen. Die Konzeptdokumente bleiben als historische und fachliche Referenz erhalten; sie sind nicht Laufzeitcode.

## Zielarchitektur Version 1

Die Anwendung ist eine lokale Vue-3-SPA mit TypeScript, Vite, Pinia, Vue Router, Zod und Tiptap. Der Vite-Entwicklungsserver stellt eine kleine lokale API bereit, die Projekte in einer SQLite-Datei speichert. Die Daten bleiben damit auf dem Rechner und ausserhalb von Git.

```text
Vue views/components
  -> Pinia project and UI stores
    -> PlanRepository
      -> SqlitePlanRepository (/api/plans)
        -> data/verlaufsplaner.sqlite
    -> schema validation + migrations
  -> export services (JSON, HTML, LaTeX, print/PDF)
```

* `src/domain/`: versioniertes WorkshopPlan-Modell, IDs, Zeit- und Materiallogik.
* `src/schemas/`: Zod-Eingabevalidierung, Import und Migrationen.
* `src/repositories/`: austauschbare Persistenz. `SqlitePlanRepository` spricht die lokale API; `LocalPlanRepository` wird nur zur einmaligen, nicht destruktiven Übernahme vorhandener Browser-Daten verwendet.
* `src/data/competencies/`: mitgelieferte, urheberrechtsunkritische Beispielkataloge. UI kennt keine katalogspezifischen Werte.
* `src/data/templates/`: fachlich unabhängige Planungsvorlagen und Registry. Vorlagen referenzieren Kompetenzrahmen und Layouts ausschließlich über IDs; sie enthalten keine kopierten Kompetenzdaten.
* `src/export/`: reine Transformationen ohne Vue-Abhaengigkeit. Raw-LaTeX-Knoten bleiben nur im TeX-Exporter unveraendert.
* `src/stores/`: Projekt-Daten und fluessiger UI-Zustand sind getrennt.
* `src/components/`: abschnittsbezogene Editoren, Vorschau und Exportdialog; keine monolithische Gesamtsicht.

## Editor und Raw LaTeX

Tiptap speichert Text als ProseMirror-JSON. Die eigene `latexInline`-Node speichert ihren Wert im Attribut `latex`; spaeter kann eine blockartige Variante daneben eingefuehrt werden. Die Exporte durchlaufen dieses strukturierte Dokument: normaler Text wird escaped bzw. als HTML gerendert, Raw-LaTeX wird nur im TeX-Export als echter LaTeX-Quelltext ausgegeben.

## Dokument- und Speichergrenzen

`WorkshopPlan` ist ein wiederverwendbarer Plan-Kern fuer Workshops und Unterrichtsstunden. Das Modell enthaelt Tage, Ziele, Kompetenzreferenzen, Freitextkapitel, Phasen und Materialien. `schemaVersion` und zentralisierte Migrationen erlauben Import alter Backups, ohne dass UI-Komponenten Migrationswissen tragen.

Ein geplanter Ausbau verwendet denselben Kern:

```text
TeachingSeries
  -> TeachingUnit[]
     -> WorkshopPlan | LessonPlan
        -> objectives, competencies, days, analyses, schedule, materials
```

`Material` hat bereits einen Ressourcen-Typ (`physical`, `file`, `worksheet`, `link`, `interactive-html`). Dateiuploads werden erst mit einer spaeteren Speicherimplementierung ergaenzt.

## Planungsvorlagen und Kompetenzrahmen

`PlanningTemplate` beschreibt den didaktischen Kontext, `CompetencyCatalog` die verfügbaren Kompetenzen und `WorkshopPlan.competencies` ausschließlich die tatsächlichen Auswahlentscheidungen.

```text
PlanningTemplate
  -> competencyFrameworkIds
  -> CompetencyCatalog
  -> CompetencyItem

WorkshopPlan.settings.templateId
  -> PlanningTemplate
WorkshopPlan.competencies
  -> konkrete Kompetenzreferenzen
```

Beim Erstellen setzt die Planfabrik die Vorlage als Startpunkt: Standardlayout und aktivierte Rahmen werden übernommen. Beim Wechsel ergänzt die Anwendung Rahmen, statt vorhandene Planungsdaten zu entfernen. Die Kompetenzansicht filtert zunächst auf aktivierte Rahmen, kann aber weitere Rahmen explizit aktivieren. Eigene Vorlagen werden im Browser lokal registriert und vor der Registrierung gegen Zod-Schema, Kompetenzrahmen- und Layout-Registry geprüft. Ein späterer Tauri- oder Electron-Adapter darf die lokale Registry durch einen Dateisystemadapter erweitern, ohne Modell oder UI-Vertrag zu ändern.

## PDF-Strategie

Version 1 erzeugt eine vollstaendige, druckoptimierte HTML-Vorschau und oeffnet den Browserdruckdialog. Das erhaelt Vektortext, Seitenumbrueche und mehrseitige Tabellen ohne Screenshot-PDFs. Ein server- oder desktopseitiger PDF-Exporter kann spaeter das `DocumentExporter`-Interface implementieren.

## Nicht uebernommen

Die frueher konzipierte SvelteKit-Anwendung, Klassenuebersichten, Authentifizierung, Lehrplan-Review-Workflow und LLM-Anbindung sind im vorliegenden Branch nicht als laufender Code vorhanden. Sie werden nicht als toter Legacy-Code in die neue App kopiert. Eine spaetere Cloud-Schicht ersetzt ausschliesslich das Repository, nicht das Planmodell oder die Exporter.

## Betriebsarchitektur und geplanter Mehrbenutzer-Ausbau

Die Anwendung bleibt ein modularer Monolith. Lokale Datenzugriffe und fachliche Repository-Verträge werden nicht durch separate Anwendungen dupliziert. Der gemeinsame API-Router wird im Entwicklungsmodus von Vite und nach `npm run build` von `npm run start` ohne HMR verwendet.

```text
Browser
  -> Web-App / API-Adapter
    -> Authentication + Authorization (geplant)
      -> fachliche Repositories
        -> SQLite (lokal/Raspberry Pi) oder später Datenbankadapter
        -> lokaler Storage-Service oder später Objekt-Storage-Adapter
```

Es sind drei klar getrennte Betriebsarten vorgesehen:

- **LOCAL:** Standard ist `127.0.0.1`; eine einzelne Person arbeitet mit einer lokalen SQLite-Datei. Ein späteres lokales Initialkonto verwendet dasselbe User-Modell wie der Serverbetrieb, blendet aber unnötige Teamfunktionen aus.
- **NETWORK:** Ein Raspberry Pi oder ein anderer LAN-Rechner bindet nach ausdrücklicher Konfiguration an `0.0.0.0`. Mehrere Browser greifen über die gleiche API zu; Authentifizierung, Eigentum und Freigaben werden dann zwingend serverseitig durchgesetzt.
- **SERVER:** Ein Reverse Proxy terminiert HTTPS und leitet an den modularen Anwendungsserver weiter. Base-URL, Sessions, Datenbank und Storage sind konfigurierbar, damit keine Fachlogik Hostnamen oder lokale Pfade kennt.

Der Übergang beginnt mit der zentralen Laufzeitkonfiguration (`APP_MODE`, `HOST`, `PORT`, `DATABASE_URL`, `STORAGE_PATH`, optional `BASE_URL`) und der additiven `users`-Tabelle. Sie enthält normalisierten Login-Identifier, Anzeigename, USER/ADMIN-Rolle, Aktivstatus und Zeitstempel; Passworthashes, Sessions und Ressourceneigentum folgen in getrennten Migrationen. Bestehende lokale Planungen werden hierbei erst im späteren Ownership-Schritt einem lokalen Default-User zugeordnet, nie still gelöscht.

## Curriculum Tracking

Offizielle Curriculumdaten sind stabil und versioniert. Lehrplanwechsel erzeugen neue Curriculum-IDs; bestehende Versionen bleiben fuer gespeicherte Planungen verfuegbar. Die Registry loest die passende Fassung nur aus `CurriculumApplicability` auf, nicht aus Fach-Sonderfaellen.

```text
Committed Curriculum
  -> Competencies, Learning Areas, Content Points
  -> stabile Node-IDs und Quellenreferenzen
  -> TeachingContext (lokal)
  -> CurriculumProgressEntry (lokal)
  -> Jahresuebersicht (spaetere UI)
```

`calculateCurriculumCoverage()` ist eine reine Berechnung. Sie speichert weder Prozentwerte noch Status in den Referenzdaten und unterscheidet Kompetenzen, Inhalte und Lernbereiche.
