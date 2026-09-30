# Stundenplanarchitektur

Ein versionierter Stundenplan besteht aus `timetables` und `timetable_entries`. Ein Eintrag referenziert eine Klassen-Fach-Zuordnung, Wochentag, Zeitfenster, Raum und Gültigkeitszeitraum. Änderungen ab Stichtag erzeugen eine neue Version statt historische Termine umzuschreiben.

`calendar_exceptions` modelliert Ferien, Feiertage, Projekttage, Ausfälle und Vertretungen. `scheduled_lessons` verbinden tatsächliche Unterrichtstermine mit Sequenzstunden und optional einem detaillierten Verlaufsplan. Der Kalender berechnet aus Stundenplan, Ausnahmen und geplanten Terminen lediglich Projektionen; die Quelldaten bleiben relational.

Eine spätere Vertretungsintegration erhält einen Adapter an dieser Grenze und keine eigene zweite Terminlogik.

Die Route `/stundenplan` verwaltet diese Daten lokal: Eine neue Version wird immer ab einem Stichtag gespeichert und kann die Slots der zuvor ausgewählten Version kopieren. Ferien, Feiertage, Ausfälle und Vertretungen sind explizite `calendar_exceptions`; kein Ausnahmefall überschreibt historische Slots oder bereits gespeicherte Termine.
