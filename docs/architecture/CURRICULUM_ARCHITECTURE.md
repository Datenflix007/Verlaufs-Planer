# Curriculumarchitektur

Die drei committed Thüringer Referenzcurricula (Geschichte 2021, Informatik 2012, Medienbildung und Informatik 2024) werden über die bestehende Registry und Zod validiert geladen. Sie bleiben unveränderliche Referenzdaten mit Quellen- und Seitenbezug.

Ein Curriculum enthält Quelle, Fach, Geltung, Kompetenzbereiche, Lernbereiche, Kompetenzen und Inhaltspunkte. Neue relationale Tabellen speichern nur Benutzerdaten und Verweise auf stabile Referenz-IDs. Offizielle Inhalte werden niemals aus Demodaten rekonstruiert oder stillschweigend durch andere Fassungen ersetzt.

Für eine Unterrichtsreihe speichern `sequence_curriculum_references` und `sequence_competencies` ausschließlich solche stabilen IDs. Die erste Tabelle hält den Lehrplananker samt Art und Relevanz fest; die zweite bewahrt Kompetenzrolle (`primary`, `secondary`, `supporting`) getrennt. Beide Tabellen sind an `teaching_sequences` kaskadierend gebunden, eindeutig pro Reihe und Referenz und verändern weder JSON-Referenzdaten noch den Originallehrplan.

Der sichtbare Lehrplanstatus ist eine reine Projektion: Passende Reihenbezüge, terminierte Sequenzstunden und deren Durchführung ergeben `scheduled`, `completed` oder `needs-revisit`. Der manuell gespeicherte Annotation-Marker wird dabei nicht verändert und bleibt die Rückfallebene ohne passenden Reihenbezug. Beim Speichern einer Durchführung werden Sequenzstunde und bereits verknüpfter Termin mit demselben Status fortgeschrieben.

`CurriculumImporter` vereinheitlicht künftig `parseSource`, `extractStructure`, `extractCompetencies`, `extractReferences`, `validate` und `import`. Fehlende Quellen werden dokumentiert, nicht erfunden.

`JsonCurriculumImporter` ist die aktuelle Importgrenze für strukturierte Referenzdaten: Jede Quelle benötigt URL und Inhalt, anschließend erzwingt die bestehende Zod-Validierung die Referenzstruktur. Fehlende oder ungültige Quellen liefern einen expliziten Fehler statt eines Ersatzcurriculums.
