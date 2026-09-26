# Verlaufsplaner

Der Verlaufsplaner ist ein lokales Werkzeug fuer Lehrkraefte, Lehramtsstudierende, Dozierende und Workshop-Leitende. Er erzeugt kein LaTeX-Formular, sondern speichert didaktische Planungen strukturiert und exportiert daraus vollstaendige Dokumente.

## Funktionsumfang

- Mehrere lokale Planungen mit Neu, Oeffnen, Duplizieren, Loeschen sowie JSON-Import und -Backup.
- Allgemeine Angaben, ein- oder mehrtaegige Termine, Lernziele und Kompetenzen aus einem austauschbaren Beispielkatalog.
- Word-artige Tiptap-Editoren fuer Inhaltsanalyse und methodisch-didaktische Analyse: Formatierungen, Ueberschriften, Listen, Zitate, Links, Hoch-/Tiefstellung, Undo/Redo, einfache Tabellen sowie explizite Raw-LaTeX-Inline- und Block-Knoten.
- Datengetriebene Verlaufsplanlayouts einschließlich der in SQLite gespeicherten Markdown-Muster „Lernstandsorientierter Verlaufsplan“ und „Kommunikationsorientierter Verlaufsplan“, Phasen/Pausen, pro Planung waehlbare Startzeit- oder Minutenansicht, Zeilenverschiebung und Materialzuordnung.
- Zentrale Materialliste mit automatischer Verwendungsaggregation.
- Vollstaendige HTML-, LaTeX- und JSON-Exporte sowie Browserdruck fuer PDF mit echtem Text und Print-CSS.
- Fach- und Disziplinvorlagen als Startpunkt: mitgelieferte allgemeine und Digital-Humanities-Vorlage, referenzierte Kompetenzrahmen, Layout- und Methodenvorschläge sowie lokale JSON-Vorlagen.

## Planungsvorlagen

Beim Anlegen einer Planung wählen Sie optional einen fachlichen Kontext. Die Vorlage **Digital Humanities** aktiviert DigComp 3.0 und hebt fachlich passende Kompetenzen hervor; alle 21 DigComp-Kompetenzen bleiben auswählbar. Ein Vorlagenwechsel löscht keine Inhalte. Unter **Vorlagen verwalten** lassen sich eigene Vorlagen lokal importieren, exportieren, duplizieren, umbenennen und löschen. Details, Datenformat und Erweiterungspunkte stehen in [konzept/Planungsvorlagen.md](konzept/Planungsvorlagen.md).

## Erste Schritte

```powershell
npm install
npm run dev
```

Alternativ starten `quickstart.bat` unter Windows und `bash quickstart.sh` unter macOS, Linux oder WSL die Anwendung direkt. Beide Skripte prüfen Node.js (mindestens 22.5), installieren fehlende Abhängigkeiten mit `npm ci` und starten den lokalen Server einschließlich SQLite-API.

Danach die von Vite angezeigte lokale Adresse oeffnen. `npm run dev` startet zugleich die lokale SQLite-Schnittstelle und legt beim ersten Start `data/verlaufsplaner.sqlite` an. Auf der Startseite steht **JenaChat-Sample laden** bereit, sofern die lokale Sample-Datei vorhanden ist. Das Sample enthält Tag 1 am 30. Juli 2026 sowie beide Tag-2-Varianten vom 31. Juli 2026.

## Screenshots

Platzhalter fuer Screenshots der Projektuebersicht, des Dokumenteditors und der Druckvorschau. Die Oberflaeche ist als ruhige Dokumentflaeche mit linker Gliederung konzipiert; Desktop hat Prioritaet, die Bereiche brechen auf Tablet- und schmalen Ansichten sinnvoll um.

## Entwicklung und Qualitaet

```powershell
npm run check
npm test -- --run
npm run build
```

Die Tests pruefen Zeitlogik, Materialaggregation, Versionsmigration und JSON-Validierung, HTML-Ausgabe, LaTeX-Escaping, Raw-LaTeX-Erhalt und Layoutdefinitionen.

## Datenhaltung und Sicherheit

Texte werden UTF-8-kodiert gespeichert. Umlaute bleiben in SQLite sowie in JSON- und HTML-Exporten erhalten.

Projekte und Verlaufsplan-Muster liegen lokal in `data/verlaufsplaner.sqlite`. Dieser Ordner ist absichtlich git-ignoriert; ebenso `data/samples/jenachat.json`, das lokale, aus dem bereitgestellten Lehrkonzept abgeleitete JenaChat-Sample. Beim ersten Öffnen überträgt die Anwendung vorhandene Browser-Planungen einmalig und nicht destruktiv in SQLite. Exportieren Sie JSON-Backups regelmaessig.

Normale Texte werden im LaTeX-Export escaped. Nur der bewusst ueber **LaTeX** im Rich-Text-Editor eingefuegte Knoten wird unveraendert in die `.tex`-Datei uebernommen.

## Projektstruktur

```text
src/
  components/       Abschnittseditoren, Rich Text, Vorschau, Exportdialog
  data/             Layouts, Kompetenzkataloge und Planungsvorlagen
  domain/           WorkshopPlan, Zeit- und Materiallogik
  export/           JSON-, HTML- und LaTeX-Exporter
  repositories/     HTTP-Repository fuer die lokale SQLite-Persistenz
server/              Vite-Entwicklungs-API fuer SQLite
data/                lokale, nicht versionierte Datenbank und Samples
  schemas/          Zod-Validierung und Migrationen
  stores/           persistente Projekte und fluessiger UI-Zustand
```

Weitere Architekturdetails: [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_MODEL.md](DATA_MODEL.md), [ROADMAP.md](ROADMAP.md) und [TODO.md](TODO.md).

## Roadmap

Als Naechstes sind Reihenplanung, Materialanhaenge, ein interaktiver Arbeitsblatt-Editor sowie eine optionale Cloud-/Desktop-Speicherimplementierung vorgesehen. Das Konzept steht in [ROADMAP.md](ROADMAP.md).
