# Arbeitsstand Verlaufsplaner

Stand: 26. September 2026. Dieses Dokument ist die Fortsetzungshilfe ohne Chat-Kontext. Es beschreibt nur den tatsächlich vorhandenen Stand; lokale Benutzerinhalte gehören nicht ins Repository.

## Letzter verifizierter Stand

- Branch: `implementationOFWorkshopMode`.
- Letzter Feature-Commit: `a04e803 feat(patterns): persist markdown schedule layouts`.
- Prüfungen nach dem Muster-Feature: `npm run check`, `npm test -- --run` (20 Tests) und `npm run build` erfolgreich.
- SQLite-API-Smoke-Test: beide Standardmuster gelesen; ein zusätzliches Muster per `PUT` gespeichert, per `GET` gelesen und per `DELETE` entfernt.
- Offene manuelle Prüfung: Kein Browser war in der Automationsumgebung verfügbar; Einstellungen, Tabellenansicht und Drucklayout wurden nicht visuell im Browser geprüft.

## Erledigt: Anwendung und Persistenz

- [x] Vue-3/Vite/TypeScript-Anwendung, Routing, Pinia, Zod-Planmigration und versioniertes `WorkshopPlan`-Format.
- [x] Lokale SQLite-Persistenz für Planungen über `SqlitePlanRepository` und Vite-API (`data/verlaufsplaner.sqlite`).
- [x] Nicht-destruktive einmalige Übernahme vorhandener Browser-Planungen.
- [x] Angaben, Termine, Lernziele, Kompetenzreferenzen, Inhalts- und didaktische Analyse sowie Materialverwaltung.
- [x] Rich-Text mit Tabellen sowie expliziten Inline- und Block-LaTeX-Knoten.
- [x] Verlaufsplantabelle mit mehreren Tagen, Pausen, Zeitlogik, Startzeit-/Daueransicht, Drag-and-drop von Zeilen und Materialzuordnung.
- [x] JSON-, HTML- und LaTeX-Export sowie Browserdruck/PDF aus strukturierten Planungsdaten.
- [x] Lokales JenaChat-Sample (git-ignoriert) mit Import über die Anwendung.

## Erledigt: Verlaufsplan-Muster in SQLite

- [x] Tabelle `schedule_patterns` mit ID, Name, Markdown-String, strukturierten Spalten, Zeitstempeln und Kennzeichnung für Standardmuster.
- [x] Bestehende Datenbanken werden bei Anwendungsstart nicht destruktiv ergänzt: `CREATE TABLE IF NOT EXISTS` plus `INSERT OR IGNORE` für die Standards.
- [x] Standardmuster **Lernstandsorientierter Verlaufsplan** gespeichert als `|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|`.
- [x] Standardmuster **Kommunikationsorientierter Verlaufsplan** gespeichert als `|Zeit|Abschnitt|Lehrerhandeln|Schülerhandeln|Materialien|Gegenstand|`.
- [x] Einstellungen → **Verlaufsplan-Muster**: eigene Muster aus einem Markdown-Tabellenkopf anlegen und wieder löschen; Standardmuster sind geschützt.
- [x] Markdown-Parser ordnet Zeit, Abschnitt, Lerngegenstand/Gegenstand, Lehrerhandeln, Schülerhandeln, Materialien und Anmerkung strukturierten Eingabefeldern zu; die Schreibweise `Abschitt` wird toleriert.
- [x] Musterwahl pro Planung wird mit der Planung gespeichert und in Editor, Vorschau, HTML- und LaTeX-Export verwendet.
- [x] Unit-Tests für Markdown-Zuordnung, SQLite-Seeding und Export mit lokalem Muster.

## Erledigt: Referenzdaten und Vorlagen

- [x] Offizielle Referenzdaten und lokale Benutzerinhalte sind getrennt: Curricula unter `src/data/`, Planungen und Muster in der ignorierten SQLite-Datenbank, lokale Planungsvorlagen im Browser.
- [x] Generisches Curriculum-Modell mit Quellen, Geltung, Kompetenzbereichen, Lernbereichen, Inhaltspunkten, Relationen und Fortschrittstypen.
- [x] Committete Thüringer Gymnasium-Datensätze: Geschichte 2021, Informatik 2012 und Medienbildung/Informatik 5/6 2024.
- [x] Registry, Zod-Validierung, Curriculum-Baum und Coverage-Berechnung auf committed Referenzdaten.
- [x] Importbericht: `reports/curriculum-import-report.md`.
- [x] Eigene Planungsvorlagen lokal registrieren, importieren, exportieren und löschen; sie referenzieren nur stabile IDs.

## Offen: kurzfristig prüfen und nachziehen

- [ ] Manuellen Browser-Sichttest durchführen: neues Muster anlegen, auswählen, Plan speichern/neu öffnen, Vorschau und HTML-/LaTeX-Export prüfen.
- [ ] Einstellungen für Verlaufsplan-Muster ergonomisch erweitern, falls benötigt: eigene Muster bearbeiten oder duplizieren; derzeit können sie angelegt und gelöscht werden.
- [ ] Die Auswahl eigener Datenbank-Muster auch in der Verwaltung lokaler Planungsvorlagen vollständig anbieten. Aktuell validiert diese Ansicht nur die mitgelieferte Layout-Registry; ein bereits im Plan gewähltes Datenbank-Muster bleibt trotzdem erhalten und nutzbar.
- [ ] `konzept/Planungsvorlagen.md` und ältere Konzeptdokumente auf den aktuellen Implementierungsstand prüfen: Teile beschreiben noch mitgelieferte Vorlagen bzw. frühere Annahmen und können vom aktuellen UI-Zustand abweichen.
- [ ] Prüfen, ob die lokale Datei `konzept/TODO.md` künftig versioniert werden soll. Sie ist derzeit über `.gitignore` bewusst nicht Teil der Commits; der Nutzer hat jedoch ausdrücklich eine sessionübergreifende Fortschrittsdokumentation verlangt.

## Offen: Anwendungsausbau

- [ ] Drag-and-drop für Tage und Lernziele (Verlaufszeilen sind bereits ziehbar).
- [ ] Persistente eigene Kompetenzkataloge und Erläuterungen je Kompetenzreferenz.
- [ ] Automatische PDF-Dateierzeugung für Umgebungen ohne Browserdruck.
- [ ] Reihenplanung, Materialanhänge und interaktiver Arbeitsblatt-Editor gemäß Roadmap.
- [ ] Optionaler Tauri-/Electron- oder Cloud-Speicheradapter, ohne die lokale Datenhoheit zu verändern.

## Curriculum-Importmatrix

| Fach / Fassung | Quelle | strukturiert | validiert | committed | Nächster Schritt |
| --- | --- | --- | --- | --- | --- |
| Geschichte Gymnasium 2021 | erfasst | Grundstruktur mit 4 Kompetenzbereichen, 4 Kompetenzen, 3 Lernbereichen, 10 Inhaltspunkten | ja | ja | seitennahe Annotation weiterer Ziel- und Unterpunkte |
| Informatik Gymnasium 2012 | erfasst | getrennte Bereiche mit 3 Kompetenzbereichen, 4 Kompetenzen, 3 Lernbereichen, 9 Inhaltspunkten | ja | ja | seitennahe Annotation weiterer Ziel- und Unterpunkte |
| Medienbildung und Informatik 5/6 2024 | erfasst | getrennt von Informatik; 3 Kompetenzbereiche, 3 Kompetenzen, 1 Lernbereich, 6 Inhaltspunkte | ja | ja | seitennahe Annotation weiterer Ziel- und Unterpunkte |
| Neue Erprobungsfassungen | teilweise als Original-PDF vorhanden | nein | nein | nein | Geltung, Fachstruktur und Nutzungsbedingungen gegen Schulportal prüfen; parallel importieren, nicht ersetzen |
| Übrige Thüringer Gymnasialfächer | Quellenliste teilweise vorhanden | nein | nein | nein | gemäß Importreihenfolge Quellen prüfen, strukturiert annotieren, validieren und separat committen |

## Arbeitsregeln für die Fortsetzung

- Referenzdaten sind versioniert und werden mit stabilen IDs, Provenienz und Review-Status committed; keine fachlichen Daten nur zur Laufzeit herunterladen.
- Planungen, Fortschritt, Muster und benutzererstellte Vorlagen bleiben lokale Benutzerinhalte. Keine davon nach `src/data/` verschieben oder committen.
- Beim Wechsel von Mustern oder Vorlagen bestehende Zeilendaten, Inhalte und Kompetenzbezüge nicht löschen.
- Für Änderungen an Datenmodell, Persistenz oder UI immer mindestens `npm run check`, `npm test -- --run` und `npm run build` ausführen.
- Bei neuen Curricula erst Quelldatei und Geltung prüfen, dann strukturieren, mit Zod testen, Bericht aktualisieren und Daten separat committen.
