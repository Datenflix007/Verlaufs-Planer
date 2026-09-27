# Dashboard-Editor

Der Dashboard-Editor unter **Einstellungen → Arbeitsbereich** verwendet ein 12-Spalten-Grid. Jedes Widget speichert ausschließlich Grid-Einheiten: `x`, `y`, `w`, `h` und `enabled`. Das echte Dashboard liest genau diese Daten; eine zweite Editor-Konfiguration gibt es nicht.

`src/data/dashboardWidgets.ts` ist die zentrale Registry. Sie enthält Titel, Icon, Mindestgröße und Standardlayout der vier verfügbaren Widgets. Ein neues Widget benötigt einen Registry-Eintrag, eine Vorschau im `DashboardEditor` und die Inhaltsdarstellung im Dashboard.

GridStack übernimmt Drag-and-drop, Raster-Snap, Mindestgrößen und Kollisionsvermeidung. Änderungen bleiben zunächst lokal im Editor und werden erst mit **Speichern** über `WorkspaceRepository` in SQLite persistiert. Entfernen setzt nur `enabled: false`; über die Palette kann das Widget wieder eingefügt werden.

Bestehende Listeneinstellungen (`order`, `width`, `height`) werden beim Laden nach `x/y/w/h` übersetzt. Auf kleinen Bildschirmen bricht das echte Dashboard auf eine Spalte um; das gespeicherte Desktop-Layout bleibt unverändert.
