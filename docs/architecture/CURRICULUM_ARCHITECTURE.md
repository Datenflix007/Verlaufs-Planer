# Curriculumarchitektur

Die drei committed Thüringer Referenzcurricula (Geschichte 2021, Informatik 2012, Medienbildung und Informatik 2024) werden über die bestehende Registry und Zod validiert geladen. Sie bleiben unveränderliche Referenzdaten mit Quellen- und Seitenbezug.

Ein Curriculum enthält Quelle, Fach, Geltung, Kompetenzbereiche, Lernbereiche, Kompetenzen und Inhaltspunkte. Neue relationale Tabellen speichern nur Benutzerdaten und Verweise auf stabile Referenz-IDs. Offizielle Inhalte werden niemals aus Demodaten rekonstruiert oder stillschweigend durch andere Fassungen ersetzt.

`CurriculumImporter` vereinheitlicht künftig `parseSource`, `extractStructure`, `extractCompetencies`, `extractReferences`, `validate` und `import`. Fehlende Quellen werden dokumentiert, nicht erfunden.
