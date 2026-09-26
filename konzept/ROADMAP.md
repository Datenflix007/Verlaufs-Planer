# Roadmap

## Version 1: lokale Planungsdokumente

Strukturierte Workshop- und Unterrichtsplaene, mehrere Tage, Ziele, Demo-Kompetenzen, Rich Text mit Raw-LaTeX, frei waehlbare Verlaufsplanlayouts, Materialien, lokale Backups, HTML/TeX/Print-Export.

## Naechster Ausbau: Reihenplanung

`TeachingSeries` gruppiert `TeachingUnit`-Einheiten. Jede Einheit verweist auf einen `WorkshopPlan`/`LessonPlan`-Kern, damit Ziele, Kompetenzen, Phasen und Materialien weder dupliziert noch umgewandelt werden muessen.

## Curriculum- und Jahresplanung

Ein lokaler `TeachingContext` ordnet Schuljahr, Klasse, Fach, Klassenstufe und eine feste Curriculum-ID zu. Eine spaetere Jahresansicht zeigt Lernbereiche mit getrennten Fortschritten fuer Kompetenzen und Inhalte. `TeachingSeries` und einzelne Stunden referenzieren Curriculum-Knoten per stabiler ID; eine automatisierte Fortschrittsaktualisierung bleibt eine explizite spaetere Entscheidung. Angezeigte Anteile werden aus Fortschrittseintraegen berechnet, nie im Lehrplan gespeichert.

## Materialanhang

Eine Repository-Erweiterung speichert Metadaten und Binaerdateien zu `Material`. Unterstuetzt werden Dateien, Links, Arbeitsblaetter und interaktive HTML-Ressourcen.

## Digitaler Arbeitsblatt-Editor

`InteractiveWorksheet` wird ein Materialtyp mit einem dokumentartigen Blockmodell: Text, Bild, Infobox, Freitext, Multiple Choice, Zuordnung, Tabelle, Bildannotation, Lehrkraft-Hinweis und Loesung. Er teilt Rich-Text- und Exportinfrastruktur mit dem Planer und exportiert als eigenstaendige HTML-Datei.

## Kollaboration und Cloud

Eine Cloud-Repository-Implementierung, Authentifizierung, Rollen, Konfliktbehandlung und Server- oder Desktop-PDF-Rendern ersetzen nur Infrastrukturadapter. Das Dokumentmodell und die Exportschnittstellen bleiben stabil.
