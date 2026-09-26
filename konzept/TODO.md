# Arbeitsstand

Stand: 25. September 2026. Dieses Dokument beschreibt den Fortsetzungsstand ohne Chat-Kontext.

## Erledigt

- [x] Aktuellen Branch komplett eingeordnet: nur Konzepte und Rohdaten, keine bestehende Anwendung oder Tests.
- [x] Zielarchitektur und Abgrenzung zur alten Konzeptbasis dokumentiert (`ARCHITECTURE.md`).

## Erledigt in Version 1

- [x] Phase A: Vue/Vite/TypeScript-Grundprojekt, versioniertes Planmodell, Zod, Repository, Pinia und Routing.
- [x] Phase B: Dokumentoberflaeche, Angaben, Termine, Ziele, Rich-Text-Kapitel und Autosave.
- [x] Phase C: Beispielkatalog, Suche, Auswahl und Katalogimport.
- [x] Phase D: konfigurierbarer Verlaufsplantabelleneditor, Pausen, Zeitlogik und Mehrtagesgruppen.
- [x] Phase E: Materialverwaltung und automatische Verwendungsliste im Export.
- [x] Phase F: JSON-, HTML-, LaTeX- und Druck/PDF-Export.
- [x] Phase G: Unit-Tests, Demo-Plan, responsive/accessibility-Politur und Dokumentation.
- [x] Phase H: Lokale SQLite-Persistenz, sichere einmalige Browserdaten-Uebernahme und git-ignoriertes JenaChat-Sample.
- [x] Phase I: Vollstaendiger JenaChat-Verlaufsplan fuer den 30./31. Juli 2026 sowie Zeilensortierung per Drag-and-drop.
- [x] Phase J: Pro Planung waehlbare Zeitangabe mit Startzeit oder Dauer in Minuten.
- [x] Phase K: Generische Fach- und Disziplinvorlagen, DigComp-3.0-Beispiel, lokale Vorlagenbibliothek und referenzbasierte Kompetenzfilterung.

## Wichtige Entscheidungen

- Der aktive Branch hat keine `package.json`; Version 1 wird als neue lokale Vue-3-SPA angelegt.
- Persistenz bleibt lokal via `SqlitePlanRepository` und `data/verlaufsplaner.sqlite`; den UI-Code nicht direkt auf Speichertechnologien zugreifen lassen. `LocalPlanRepository` dient ausschliesslich der einmaligen, nicht destruktiven Datenuebernahme.
- Das native Format ist validiertes, versioniertes JSON. Exporter lesen `WorkshopPlan`, nie Komponenten-DOM.
- Raw-LaTeX ist ausschliesslich ein expliziter Editor-Knoten und wird nicht aus normalem Text erraten.
- PDF ist Browserdruck einer eigenstaendigen Druckansicht; keine Raster-Screenshots.

## Verifikation

- Vor Implementierungsbeginn waren keine TypeScript-, Build- oder Testbefehle vorhanden, weil keine Node-Anwendung eingecheckt war.
- Nach jedem Paket ausgefuehrt: `npm run check`, `npm test -- --run`, `npm run build`.
- `npm run check`, `npm test -- --run` und `npm run build` liefen nach der SQLite-Umstellung erfolgreich. Der lokale API-Smoke-Test hat das JenaChat-Sample mit 13 Verlaufszeilen in SQLite gespeichert und wieder ausgelesen. Ein visueller Browser-Sichttest bleibt offen, da in der aktuellen Automationsumgebung kein Browser verfuegbar ist.

## Bekannte naechste Verbesserungen

## Curriculum-Importmatrix

| Fach / Fassung | Quelle erfasst | strukturiert | validiert | committed |
| --- | --- | --- | --- | --- |
| Geschichte Gymnasium 2021 | ja | Grundstruktur, Ausbau offen | ja | nach erstem Curriculum-Commit |
| Informatik Gymnasium 2012 | ja | Grundstruktur, Ausbau offen | ja | nach erstem Curriculum-Commit |
| Medienbildung und Informatik 5/6 2024 | ja | Grundstruktur, Ausbau offen | ja | nach erstem Curriculum-Commit |
| Uebrige Gymnasialfaecher | Quellenliste vorhanden | nein | nein | nein |

Die drei Datensaetze sind keine Platzhalter: Sie enthalten Quellen, Geltung, Kompetenzbereiche, Lernbereiche und getrennte Inhaltspunkte. Die vollstaendige, seitennahe Annotation der einzelnen Kompetenz- und Inhaltspunkte wird fortgesetzt. Neue 2026er Erprobungsfassungen bleiben als parallele Importaufgabe offen, bis ihre Applicability und Struktur gegen die jeweiligen Original-PDFs geprueft sind.

- [x] Block-LaTeX-Dialog und einfache Tabellen im Rich-Text-Editor.
- [ ] Drag-and-drop fuer Tage und Lernziele; Verlaufszeilen sind bereits direkt ziehbar.
- [ ] Persistente eigene Kompetenzkataloge sowie Feld fuer Erlaeuterungen je Kompetenzreferenz.
- [ ] Automatische PDF-Dateierzeugung fuer Umgebungen ohne Browserdruck.
