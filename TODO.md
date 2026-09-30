# TODO

## Schuljahres-, Lehrplan- und Sequenzplanung (Großauftrag)

### 0. Bestandsaufnahme und Architektur

- [x] Vue/Vite-, Pinia-, Routing-, SQLite-, Dashboard-, Kalender-, Material- und Präsentationsarchitektur sowie bestehende Datenmigrationen analysieren.
- [x] Die vorhandenen, Zod-validierten Thüringer Referenzcurricula für Geschichte, Informatik und Medienbildung/Informatik einschließlich Quellen- und Importreport identifizieren.
- [x] Architekturentscheidungen und Abgrenzungen in den neun angeforderten `docs/architecture/`-Dokumenten festhalten.

### 1. Relationale Planungsgrundlage und Migration

- [x] Separaten relationalen SQLite-Bereich für Schuljahre, Klassen/Kurse, Fachzuordnungen, Annotationen, Reihen, Sequenzstunden und geplante Termine anlegen; bestehende Plan-JSONs unverändert erhalten.
- [x] Strikte TypeScript- und Zod-Domainmodelle für die neue Ebene sowie eine rückwärtskompatible Zuordnung vorhandener Workshops als `WORKSHOP`/`OTHER` implementieren.
- [x] Repositories, API-Routen, Indizes und migrationssichere Defaults implementieren.
- [x] Unit- und SQLite-Tests für Schuljahr, Klasse/Fach/Lehrplan-Zuordnung und Migration ergänzen.

#### 1.1 Bedienbare Schuljahresverwaltung

- [x] Eine zugängliche Oberfläche für Schuljahr, Klasse/Kurs und Fachlehrplan-Zuordnung auf Grundlage der neuen API implementieren.
- [x] Die verfügbaren verifizierten Curricula passend zu Klassenstufe, Fach und Thüringen zur Auswahl anbieten; nicht verfügbare Lehrpläne nicht vortäuschen.
- [ ] Die Verwaltungsoberfläche über Routing und Dashboard erreichbar machen und mit einer Komponentenprüfung absichern.

### 2. Lehrplan-Annotation und Jahresplanung

- [x] Pro Klassen-Fach-Zuordnung eine transparente Lehrplanabdeckung aus dokumentierten Statusmarkern anzeigen.
- [x] Lehrplankommentare im persönlichen Layer bearbeiten und löschen können.
- [x] Eine Jahresplanungsübersicht aus den gespeicherten Wochenmarkern im Curriculum-Viewer ableiten.
- [x] Wochenmarker pro Lehrplanknoten im persönlichen Annotation-Layer erfassen und im Viewer sichtbar machen.
- [ ] Klassenbezogenen Fortschritts-, Wochenmarker- und Kommentar-Layer getrennt von den unveränderlichen Referenzcurricula implementieren.
- [x] Curriculum-Status semantisch (vorgemerkt, geplant, behandelt, erneut aufgreifen) inklusive Text, Icon, ARIA und zentraler Farbtokens ableiten.
- [x] Curriculum-Viewer mit Quellenreferenz, Annotationsrandspalte, Jahresplanung und interaktiven Wochenmarkern implementieren.
- [ ] Tests für Parallelklassen-Trennung, Kommentare, Marker und Statusableitung ergänzen.
  - [x] SQLite-Regression für unabhängige Parallelklassen-Marker und editierbare Kommentare absichern.

### 3. Reihen- und Sequenzplanung

#### 3.1 Reihe aus Lehrplanbereich

- [x] Eine Sequenzstunde gezielt mit einem bestehenden detaillierten Verlaufsplan verknüpfen und ihre Planungsdaten übernehmen.
- [x] Reihenstunden als visuelle Sequenz-Timeline mit Terminstatus und offenen Planungslücken darstellen.
- [x] Eine Sequenzstunde in einen neuen detaillierten Verlaufsplan überführen und die Rückreferenz speichern.
- [x] Gespeicherte Reihen inklusive Sequenzstunden in einen anderen Klassen-Fachbereich kopieren.
- [x] Aus dem Curriculum-Viewer direkt eine Reihe erstellen und die Lehrplanmarkierung mit der gespeicherten Reihe verknüpfen.
- [x] Aus einer Lehrplanmarkierung eine gespeicherte Unterrichtsreihe mit Titel, Zeitraum, Leitfrage und Lehrplanreferenz anlegen.
- [x] Eine Sequenzansicht mit tatsächlich gespeicherten SequenceLessons und direktem Hinzufügen von Stunden bereitstellen.
- [ ] Reihenanlage und Sequenzstunden mit Domain- und Komponentenprüfungen absichern.

- [ ] TeachingSequence, Curriculum-/Kompetenzreferenzen und SequenceLesson als relationale Datenmodelle implementieren.
- [ ] Lehrplan-zu-Reihe-Workflow, hochwertige Sequenz-Timeline, Matrix-Ansicht und Klassenkopie implementieren.
- [x] Übernahme einer SequenceLesson in einen bestehenden detaillierten Verlaufsplan implementieren.
- [ ] Domain-, Repository- und Komponentenprüfungen für Reihen, Sequenzstunden und Datenübernahme ergänzen.

### 4. Stundenplan und Kalender

- [x] Sequenzstunden direkt mit einem gespeicherten Unterrichtstermin (Datum, Zeit, Unterrichtskontext) verknüpfen und Verschiebungen am Termin sichtbar machen.
- [ ] Versionierbaren Stundenplan, Kalenderausnahmen, Feiertage, Ferien, geplante Termine und Vertretungen modellieren.
  - [x] Relationale Grundlage für Stundenplanversionen und datumsbezogene Kalenderausnahmen implementieren.
- [ ] Sequenzstunden mit dem Kalender verbinden, Terminverschiebungen sichtbar machen und kalenderlesbare Daten bereitstellen.
- [x] Kalender- und Dashboardansichten um Klassen-, Fach-, Reihen- und Terminbezug erweitern.
- [ ] Tests für Stundenplanwechsel, Ausnahmen, Ferien und Terminzuordnungen ergänzen.

### 5. Durchführung, Reflexion und Verlaufsplan

- [x] Abschluss einer Sequenzstunde auf den verknüpften persönlichen Lehrplanstatus zurückführen.
- [x] Für eine Sequenzstunde den tatsächlichen Durchführungsstatus mit kurzer Reflexionsnotiz speichern.
- [ ] Abschlussstatus, Stunden- und Reihenreflexion sowie nachvollziehbare Auswirkungen auf den Lehrplanstatus implementieren.
- [ ] Bestehende Verlaufsplanung als zugängliche Kompakt-/Detail-Timeline weiterentwickeln, ohne Workshop- und Präsentationsabläufe zu brechen.
- [ ] Didaktische Hinweise, technische Voraussetzungen, Differenzierung, digitale Tools und Fallback-Plan schrittweise als optionale Daten ergänzen.

### 6. Import, Einstellungen und Onboarding

- [ ] CurriculumImporter-Schnittstelle, Quellennachweis und Fehlermeldung für nicht vorhandene offizielle Curricula vorbereiten, ohne Inhalte zu erfinden.
- [ ] Einstellungen für Schule, Bundesland, Schuljahr, Klassen, Fächer, Curricula und Stundenplan ergänzen.
- [ ] Onboarding-Workflow für die erste Schuljahresplanung ergänzen.

### 7. Abschluss, Qualität und Dokumentation

- [ ] Responsive, tastaturbedienbare und kontrastreiche UI mit reduzierter Bewegung umsetzen; Farbe nie als alleiniges Signal verwenden.
- [ ] Vollständige Typ-, Unit-, SQLite-, Browser- und Build-Prüfungen je Phase durchführen und TODO-Status erst danach aktualisieren.
- [ ] `IMPLEMENTATION_SUMMARY.md` mit Architektur, Migration, Tests, Einschränkungen und Roadmap vervollständigen.

## Widget-Vorlagen, Farbsets und elegante Zeitstrahlbearbeitung

- [ ] Bestehende Widget-Datenmodelle, Editor- und Präsentationsrenderstrecken sowie Tests analysieren und Ausgangsprüfungen ausführen.
- [ ] Wiederverwendbare Widget-Vorlagen und konfigurierbare Farbsets rückwärtskompatibel im Präsentationsmodell ergänzen.
- [ ] Die Zeitstrahlbearbeitung als kompakte, klar gegliederte Inspector-Oberfläche mit schnell erreichbaren Vorlagen und Farbsets gestalten.
- [ ] Vorlagen- und Farbset-Auswahl für alle unterstützten Widgets im Editor zugänglich machen und im Präsentationsfenster identisch rendern.
- [ ] Unit-, Komponenten-, Typ-, Gesamt- und Build-Prüfungen ausführen und die TODO-Punkte nach erfolgreicher Prüfung abschließen.

## Zeitstrahl-Design und Mausrad-Zoom

- [x] Bestehende Zeitstrahl-, Zoom-, Pan- und Synchronisationsstrecken analysieren sowie Ausgangsprüfungen ausführen.
- [x] Zeitstrahl als hochwertige historische Ereignisachse mit klaren Karten, Jahresmarken und überlappungsfreier Bearbeitungsansicht gestalten.
- [x] Stufenloses Zoom per Mausrad in Referentenansicht und freigegebenem Präsentationsfenster ergänzen und synchronisieren.
- [x] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Historischer, live bearbeitbarer Zeitstrahl

- [x] Datenmodell, Zeitstrahl-Widget, Referentenansicht und Synchronisationskanal analysieren sowie Ausgangsprüfungen ausführen.
- [x] Historische Beispielereignisse mit echten Zeitpunkten als Ausgangszustand statt Ablaufphasen bereitstellen und alle Ereignisfelder editierbar halten.
- [x] Zeitstrahlbearbeitung in der Referentenansicht mit Hinzufügen, Löschen, Ausrichtung und direkter Synchronisierung ins Präsentationsfenster ergänzen.
- [x] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Live-Balkenvorschau für Abstimmungen in der Referentenansicht

- [x] Abstimmungsdaten, Referentensteuerung und bestehende Browser-/Komponententests analysieren sowie Ausgangsprüfungen ausführen.
- [x] Für jede Ja/Nein- und Mehrfachauswahl eine nur für Referierende sichtbare Live-Balkenvorschau mit Stimmen, Anteilen und Gesamtzahl ergänzen.
- [x] Sicherstellen, dass die Vorschau eingehende Stimmen sofort abbildet, ohne die Ergebnissperre im Präsentationsfenster aufzuheben.
- [x] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Einheitliche Folienformatierung in beiden Ansichten

- [x] Gemeinsame Canvas-Renderstrecke sowie Größen- und Skalierungsunterschiede in Referenten- und Präsentationsfenster analysieren und Ausgangsprüfungen ausführen.
- [x] Eine feste 1280×720-Entwurfsfläche im gemeinsamen Foliencanvas einführen, die nur als Ganzes auf die verfügbare Ansicht skaliert wird.
- [x] Presenter- und Audience-Ansicht einschließlich Zoom, Ink-Overlay und interaktiver Widgets auf das identische Layout prüfen.
- [x] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Ausschnitt per rechter Maustaste verschieben

- [x] Bestehende Zoom-, Pan- und Synchronisationsstrecke in Canvas, Referenten- und Präsentationsansicht analysieren sowie Ausgangsprüfungen ausführen.
- [x] Rechtsklick-Ziehen mit mausstreckenabhängiger, geglätteter Bewegung im gemeinsamen Foliencanvas umsetzen.
- [x] Pfeil-Schaltflächen entfernen und die aktualisierte Ausschnittposition zwischen Referent und Präsentationsfenster synchronisieren.
- [x] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Medien als lokale Kopie oder URL

- [x] Bestehende Medien-Auswahl, Präsentationselemente, SQLite-Persistenz und die API-Strecke analysieren sowie Ausgangsprüfungen ausführen.
- [x] Medienmodell und serverseitige Speicherung für Bilder und Videos als lokale, planbezogene Kopie ergänzen.
- [x] Bild- und Videoeinfügung über URL sowie per lokaler Datei in den Präsentationseditor integrieren.
- [x] Lokale Medien beim Laden und im Präsentationsfenster zuverlässig ausliefern und darstellen.
- [x] Abstimmungs-Widget für Ja/Nein und freie Auswahlmöglichkeiten mit Teilnehmenden-Klicks und erst nach Referentenfreigabe sichtbarem Ergebnis ergänzen.
- [x] Gezoomten Bildausschnitt in Referenten- und Präsentationsansicht per Richtungssteuerung synchron verschiebbar machen.
- [x] Schema-, Server-, Komponenten- und Browsertests sowie Typprüfung, Gesamttests, Build und Diff-Prüfung ausführen.

## Zeitstrahl-Widget, Schriftarten und Formen

- [x] Bestehendes Präsentationsmodell, Schema, Editor-Toolbar, Canvas und Tests analysieren sowie Ausgangsprüfungen ausführen.
- [x] Zeitstrahl-Datenmodell mit editierbaren Ereignissen, Duplizierung und Schema-Validierung ergänzen.
- [x] Zeitstrahl als sichtbares, editierbares Widget in Editor, Referenten- und Präsentationsansicht integrieren.
- [x] Schriftfamilien einschließlich Times New Roman und zusätzliche tatsächlich gerenderte Formen ergänzen.
- [x] Unit-, Komponenten- und Browsertests sowie Typprüfung, Gesamttests, Build und Diff-Prüfung ausführen.

## Beidseitige Mindmap-Hauptaeste

- [x] Bestehendes horizontales Mindmap-Automatiklayout und seine Knotenreihenfolge analysieren.
- [x] Hauptaeste links und rechts der Wurzel verteilen und Unteraeste auf ihrer jeweiligen Seite halten.
- [x] Layout-, Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Skalierbare Referentenfolie ohne Seitenscrollen

- [x] Verfuegbaren Vorschauplatz und Sprechernotizen in der Referentenansicht analysieren.
- [x] Automatische Anpassung an den verfuegbaren Platz sowie separate Vorschau-Verkleinerung und -Vergroesserung implementieren.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Nahtlose und live synchronisierte Leuchtspur

- [x] Fade-Fenster fuer eine optisch kontinuierliche Leuchtspur verdichten.
- [x] Laufende Stiftzuege mit stabiler ID waehrend des Zeichnens zwischen Referenten- und Präsentationsfenster uebertragen.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Magic-Pen-Charakter fuer den Leuchtstift

- [x] Bestehende lueckenlose Leuchtspur als Basis fuer eine mehrschichtige Lichtkante analysieren.
- [x] Farbsaum, Tinten-Kern und dezente Lichtkante ohne Filterartefakte rendern.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Lueckenlose Leuchtspur ohne Farbverdichtung

- [x] Teilpfade an gemeinsamen Kurvenpunkten statt an sichtbaren Referenzpunkten trennen.
- [x] Ueberzeichnete Segmentueberlappungen entfernen und die Tablet-Optik testen.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Tabletartige, nahtlose Leuchtspur

- [x] Bestehende getaktete Leuchtspur und die sichtbaren Kappen an Segmentgrenzen analysieren.
- [x] Leuchtspurpfade zu einer glatten Handschriftkurve verbinden und Segmentkappen unsichtbar machen.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Elegante, getaktete Leuchtspur

- [x] Aktuelles Segment-Rendering und Filterartefakte analysieren sowie Ausgangstests ausführen.
- [x] Zeitlich getaktete, überlappende Leuchtspurabschnitte mit sanftem Ausfaden statt punktweiser Filterfragmente rendern.
- [x] Leuchtspur ohne harte Filterkanten visuell sowie mit Komponenten- und Browserprüfungen absichern.
- [x] Typprüfung, Gesamttests, Produktions-Build und Diff-Prüfung ausführen.

## Punktweises Verblassen des Leuchtstifts

- [x] Bestehenden Leuchtstift-Datenfluss und Ablaufzeiten analysieren sowie Ausgangstests ausführen.
- [x] Zeitstempel für während des Zeichnens erzeugte Punkte übertragen und jedes Leuchtstiftsegment individuell ausfaden.
- [x] Leuchtstiftspur erst entfernen, wenn ihr zuletzt gesetzter Punkt vollständig verblasst ist.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserprüfungen ausführen.

## Marker-Verblassen und klickbarer Radierer

- [x] Marker-Zeitsteuerung und Radierereingaben analysieren sowie Ausgangstests ausführen.
- [x] Markiererspur nach der einstellbaren Dauer zuverlässig in beiden Präsentationsfenstern entfernen.
- [x] Radierer so begrenzen, dass er nur bei linker gedrückter Maustaste auf einer Spur löscht, nie beim bloßen Überfahren.
- [x] Komponenten-, Typ-, Gesamt-, Build- und Browserprüfungen ausführen.

## Persistente und beidseitig synchronisierte Vortragszeichnungen

- [x] Bestehenden Zeichenkanal, Folienwechsel und Verbindungsaufbau analysieren; Ausgangstests ausführen.
- [x] Stift- und Markiererspuren pro Folie für die gesamte Vortragssitzung erhalten, statt sie beim Folienwechsel zu verwerfen.
- [x] Vollständige Zeichenschnappschüsse beim Verbinden übertragen und neue Stift- sowie Radieraktionen in beide Richtungen abgleichen.
- [x] Referentenaktion zum eindeutigen Löschen aller Zeichnungen der aktuellen Folie ergänzen.
- [x] Regressionstests, Typprüfung, Gesamttests und Produktions-Build ausführen.

## Mindmap-Neuverbindung und freigegebenes Live-Zeichnen

- [x] Auswahl und direkte Neuverbindung einzelner Mindmap-Knoten analysieren und implementieren, einschließlich Schutz vor Zyklen.
- [x] Radiergummi für Stift- und Leuchtstiftspuren in Referenten- und Präsentationsansicht implementieren.
- [x] Live-Spuren aus der Referentenansicht im Präsentationsfenster darstellen und eingehende Publikumsaktionen synchron halten.
- [x] Schalter in der Referentenansicht hinzufügen, der die Zeichenwerkzeuge im Präsentationsfenster pro Folie explizit freigibt.
- [x] Komponenten-, Typ-, Gesamt- und Build-Prüfungen ausführen.

## Presenter-Werkzeuge: Mindmap, Zoom und Live-Zeichnen

- [x] Bestehende Mindmap-, Presenter-, Audience- und Zeichenpfade analysieren sowie Typprüfung und Tests als Ausgangsbasis ausführen.
- [x] Mindmap-Knoten im Bearbeitungsmodus löschbar machen und dabei den Wurzelknoten schützen.
- [x] Stift- und Plenums-Zoom-Schaltfläche auf allen Vortragsfolien einheitlich oben rechts anordnen.
- [x] Unabhängigen Zoom nur für die Referentenansicht sowie synchronisierbaren Plenums-Zoom anbieten.
- [x] Mehrfarbige Stifte und einen konfigurierbar nach Sekunden verschwindenden Leuchtstift für Referierende bereitstellen und an das Publikum übertragen.
- [x] Komponenten-Tests, Typprüfung, Gesamttests und Produktions-Build ausführen.

## Mindmap live im Vortrag und Präsentationsexport

- [x] Aktuelle Präsentationsarchitektur, SQLite-Speicherweg und Exportmöglichkeiten prüfen; Typprüfung und Tests als Ausgangsbasis ausführen.
- [ ] Presenter-Werkzeug zum Bearbeiten der Mindmap auf der aktuellen Folie ergänzen, ohne andere Folienelemente oder stabile IDs zu verändern.
- [ ] Mindmap-Änderungen während des Vortrags zuverlässig in SQLite speichern und per BroadcastChannel live an Audience übertragen; Reload und Verbindungsaufbau berücksichtigen.
- [ ] Selbstständigen HTML-Export aller Folien mit Navigation und eingebetteten Medien implementieren.
- [ ] Direkten PDF-Export aller Folien implementieren und die Ausgabe visuell prüfen.
- [ ] Export-Einstiegspunkte im Präsentationseditor ergänzen und Fehlerzustände anzeigen.
- [ ] Unit-, Integrations- und Edge-Browsertests für Live-Bearbeitung, Synchronisierung, Speicherung und beide Exportformate ergänzen.
- [ ] Dokumentation aktualisieren, vollständige Tests, Typprüfung, Build und Browser-Workflow ausführen.

## Mindmap-Widget und Zweitbildschirm-Präsentation

- [x] Bestand, Persistenz, Editor, Presenter/Audience, vorhandene Tests und Browser-APIs prüfen; Ausgangstests ausführen.
- [x] Mindmap-Typen, validiertes JSON-Modell und stabile ID-Regeln ergänzen.
- [x] Knotenoperationen, Duplizierung, Astfarben und Tree-/Radial-Layout implementieren und testen.
- [x] Mindmap in Folien-Canvas und Toolbar integrieren; Bearbeitungsmodus mit Knoten, Shortcuts, Drag-and-drop, Bildquellen, Zoom/Pan und Eigenschaften anbieten.
- [x] Audience-/Presenter-Rendering für Mindmaps ohne Bearbeitungselemente prüfen.
- [x] Mehrbildschirm-Start mit Screen-Details-Erkennung, Auswahl und Popup-Fallback implementieren.
- [x] Vollbildversuch, Ein-Klick-Fallback, Statussynchronisierung und Trennungsbehandlung ergänzen und testen.
- [x] Mindmap- und Mehrbildschirm-Tests einschließlich Speicherung/Reload und Fehlerszenarien ergänzen.
- [x] Präsentationsdokumentation, Browsergrenzen und offene optionale Punkte aktualisieren.
- [x] Typprüfung, vollständige Tests, Build und Edge-UI-Workflow prüfen.
- [ ] Optional: Mindmap-Äste während des Vortrags interaktiv aufklappen und per BroadcastChannel synchronisieren.
- [ ] Optional: Knoten-Copy/Paste, Mindmap-Export und persistente Präsentationseinstellungen ergänzen.

## Regression: Präsentationseditor wieder bedienbar machen

- [x] Fehler beim Bearbeiten und Duplizieren mit reaktiven Präsentationsdaten reproduzieren.
- [x] Kopieren für Undo/Redo, Folien und Elemente korrigieren.
- [x] Regressionsfall mit reaktiven Daten testen.
- [x] Typprüfung, Tests und Build ausführen.
- [ ] Editorablauf im Browser prüfen (Fenstersteuerung derzeit nicht erreichbar).

## Präsentationseditor – Ausbaustufe

- [x] Bestehende Präsentationskomponenten, Modell, Persistenz, Pointer-Interaktion und Tests analysieren.
- [x] Ausgangsprüfung mit Typprüfung, Tests und Produktions-Build durchführen.
- [x] Rückwärtskompatibles V3-Modell für Elementstile, Formen, Layouts, Hintergrund, Übergänge und lokale Bilddaten migrieren.
- [x] Dunkles Desktop-Editor-Grundlayout mit kompakter Kopfzeile, Canvas-Workspace, Folien-Thumbnails, Properties und Statusleiste umsetzen.
- [x] Toolbar mit Textvarianten, Bild-Upload, Formmenü, Layout, Design, Hintergrund, Duplizieren/Löschen, Zoom und kontextbezogenen Aktivzuständen umsetzen.
- [x] Inline-Textbearbeitung, umfangreiche Text-Eigenschaften, Auswahlrahmen und acht Resize-Handles implementieren.
- [x] Formen, Bild-Fit/Deckkraft/Eckenradius, Layer-Reihenfolge, Ausrichtung und Kontextmenü implementieren.
- [x] Nicht-destruktive Folienlayouts, Theme-Cards, Hintergrundfarbe/-bild und sichtbare Sprechernotizen implementieren.
- [x] Lokale Undo-/Redo-History, Tastaturkürzel, Vorschau und Folienlisten-Einstiegspunktindikatoren implementieren.
- [ ] Einfache Folienübergänge und Präsentationsvorlagen funktionsfähig machen (Übergänge fertig; Vorlagen bleiben offen).
- [ ] Tests für Undo/Redo, Sprechernotizen und Übergänge auf Komponentenebene ergänzen.
- [x] docs/PRESENTATION_MODE.md mit Editorarchitektur, Elementen, Layouts, History und Materialintegration ergänzen.
- [x] Priorität-4-Themen (Grid, MultiSelect, Crop, Tabellen, volle Materialbibliothek) als offene Ausbauschritte dokumentieren.
- [ ] Typprüfung, Tests, Produktions-Build und Browserprüfung durchführen.

## Integrierter Präsentationsmodus

- [x] Bestehende Vue-Architektur, Planmodell, SQLite-Persistenz und vorhandene Material-Präsentationen analysieren.
- [x] Ausgangsprüfung mit Typprüfung, Tests und Produktions-Build durchführen.
- [x] Rückwärtskompatibles Präsentationsmodell mit stabilen Folien-IDs und Einstiegspunkten am Planmodell ergänzen.
- [x] Präsentations-Persistenz über den bestehenden atomaren SQLite-Plan-Payload und die V1-zu-V2-Migration implementieren.
- [x] Folien-CRUD (Erstellen, Duplizieren, Löschen, Sortieren) mit stabilen IDs und Broken-Link-Schutz implementieren.
- [x] Route, linke Hauptnavigation und Präsentations-Unternavigation ergänzen.
- [x] Präsentationseditor mit Folienleiste, Canvas und MVP-Elementen (Text, Bild, Form) implementieren.
- [x] Auswahl, Verschieben, Größenänderung, Löschen und Duplizieren von Canvas-Elementen implementieren.
- [x] Sprechernotizen, Themenauswahl und vorbereitete Unterbereiche für Vorlagen, Animation und Moderation ergänzen.
- [x] Präsentations-Einstiegspunkte an Verlaufsplanphasen erstellen, anzeigen, öffnen, neu zuweisen und entfernen können.
- [x] Presenter Console mit Verlaufsplan, aktueller/nächster Folie, Notizen, Timer und Tastatursteuerung implementieren.
- [x] Audience-Route/Fenster sowie BroadcastChannel-Synchronisation und Popup-Fallback implementieren.
- [x] Testfälle für stabile Folien-IDs, Einstiegspunkte, Löschverhalten und Präsentationskanal ergänzen.
- [x] Architektur, Datenfluss, Browser-Fallbacks und Migration in docs/PRESENTATION_MODE.md dokumentieren.
- [x] README um den Presentation-Mode-Überblick ergänzen.
- [ ] Typprüfung, Tests, Produktions-Build und eine Browser-Prüfung des Kernworkflows durchführen.

- [x] Dashboard-Kopf analysieren und die zu entfernenden Texte lokalisieren.
- [x] „Lokaler Arbeitsbereich“, „Mein Dashboard“ und die Beschreibung entfernen; Untertitel unter „Verlaufsplaner“ ergänzen.
- [x] Typprüfung, Tests und Build ausführen.
- [x] Bestehende Aufgaben-, Planungs- und Arbeitsbereichsdaten für Prioritäten analysieren.
- [ ] Anpassbare Prioritäten mit Drag-and-drop-Reihenfolge und Migration im Arbeitsbereich implementieren.
- [ ] Priorität bei Aufgaben und Planungen erfassen sowie gewichtete Widget-Anzeige implementieren.
- [ ] Prioritäts-Heap und Gewichtung unter `konzept/` dokumentieren und Tests ergänzen.
- [ ] Typprüfung, Tests und Build ausführen.
- [x] Digitalen Baukasten analysieren und die rot markierten Navigations- und Hilfselemente identifizieren.
- [x] Baukasten auf eine fokussierte Arbeitsfläche reduzieren und die entfernten Bedienelemente aus der Oberfläche lösen.
- [x] Bearbeitbare Dokumente für Präsentationen, digitale Arbeitsblätter und Mindmaps mit Abschnitten implementieren.
- [x] Mehrseitige Präsentationen mit beliebig vielen Folien und Zuordnung zu Stundenabschnitten implementieren.
- [x] Baukasten-Änderungen automatisiert prüfen und die TODO-Liste abschließen.
- [x] Regression im digitalen Baukasten analysieren und die zuvor funktionierende Canvas-Ansicht wiederherstellen.
- [x] Nur die rot markierten Navigations-, Baustein- und Umschaltelemente aus der wiederhergestellten Canvas-Ansicht entfernen.
- [x] Wiederhergestellten Baukasten typprüfen, testen und bauen.
- [x] Zeichencodierung des digitalen Baukastens verlustfrei wiederherstellen und deutsche Texte prüfen.
- [x] Einen dokumentorientierten Editor für Präsentationen, Arbeitsblätter und Mindmaps ergänzen, ohne die Canvas-Ansicht zu ersetzen.
- [x] Dokumenteditor mit Folien, Abschnitten, Seiten und Mindmap-Knoten persistent machen und prüfen.
- [x] Direkte Einstiege zum Erstellen und Bearbeiten digitaler Materialien auf der Canvas ergänzen.
- [x] Einstieg typprüfen und die Nutzung dokumentieren.
- [x] Kalender-Monatszeilen dynamisch an die Widget-Höhe koppeln.
- [x] Typprüfung, Tests und Build ausführen.
- [x] Automatische, entprellte Speicherung für Änderungen im Dashboard-Editor ergänzen.
- [x] Typprüfung, Tests und Build ausführen.
- [x] Abstand, Einzug und Handschrift-Stil des Dashboard-Untertitels anpassen.
- [x] Typprüfung, Tests und Build ausführen.
