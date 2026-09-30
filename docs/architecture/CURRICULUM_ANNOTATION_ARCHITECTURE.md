# Architektur des Lehrplan-Annotationslayers

Annotationen sind ein separater persönlicher Layer pro Klassen-Fach-Zuordnung. `curriculum_annotations`, `curriculum_planning_markers` und `curriculum_comments` referenzieren stabile Curriculum-IDs, verändern jedoch nie den Ursprungstext.

Statuswerte sind `rough-planned`, `scheduled`, `completed` und `needs-revisit`. Sie werden zusätzlich als Label, Icon, Tooltip und ARIA-Text dargestellt. Wochenmarker können einen Zeitraum und eine Priorität enthalten. Kommentare unterstützen Textanker, Bearbeitung, Löschen sowie Erledigt-/Wiederöffnen-Status.

Die Fortschrittsprozentzahl beschreibt ausschließlich dokumentierte Lehrplanabdeckung, nie erreichte Kompetenz.
