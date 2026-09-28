# TODO

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
