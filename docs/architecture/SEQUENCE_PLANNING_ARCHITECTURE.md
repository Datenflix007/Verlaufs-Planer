# Reihen- und Sequenzplanung

`teaching_sequences` gehören zu Schuljahr, Klasse, Fach und Klassen-Fach-Zuordnung. Sie speichern Titel, Zeitraum, Leitfrage, Lernziel, didaktische Hinweise und Status. `sequence_curriculum_references` und `sequence_competencies` sind separate Join-Tabellen mit eindeutigen Referenzen; erstere speichert Lehrplanknoten und Beziehungstyp, letztere Kompetenz-ID und Rolle (`primary`, `secondary`, `supporting`).

`sequence_lessons` sind die Makroplanung einer Stunde: Position, Datum, Dauer, Leitfrage, Lernziel, Inhalte, Methoden, Material, didaktische Notiz und Status. Erst eine bewusste Aktion erzeugt bzw. verbindet daraus einen detaillierten bestehenden Verlaufsplan.

Die Primäransicht ist eine zugängliche Timeline; eine Matrix bleibt als Übersicht, Export- und Druckansicht verfügbar. Kopien für Parallelklassen erhalten neue IDs und bleiben danach unabhängig.

Beim Erstellen aus dem Lehrplan wird der ausgewählte Knoten als primärer Reihenbezug gespeichert; zugehörige Kompetenzen können gezielt ausgewählt und gerollt werden. Beim Kopieren in eine Parallelklasse werden die Join-Datensätze mit neuen IDs kopiert. Damit bleiben die Referenzcurricula unverändert und beide Klassen planen unabhängig.

Nach dem Abschluss einer Reihe speichert `sequence_reflections` genau eine persönliche Auswertung pro Reihe: behandelte Inhalte und Lehrplanbereiche, offene Inhalte, erneut aufzugreifende Kompetenzen, künftig anzupassende Stunden sowie einen Materialhinweis für das nächste Schuljahr. Das Speichern setzt ausschließlich den Status dieser Reihe auf `completed`; eine Kopie für eine Parallelklasse übernimmt keine Reflexion. Die Tabelle hängt per Fremdschlüssel an der Reihe und wird beim Löschen der Reihe kaskadiert entfernt.

Eine `SequenceTemplate` ist ausschließlich ein Browser-lokaler Benutzerinhalt. Sie enthält den wiederverwendbaren Reihenentwurf mit stabilen Curriculum-/Kompetenz-IDs und didaktischer Stundenstruktur, aber weder IDs von Klassen oder Fachzuordnungen noch Termine, Detailpläne, Durchführungsdaten oder Reflexionen. Beim Verwenden entstehen neue Reihen-, Join- und Stunden-IDs für die aktuell gewählte Klassen-Fach-Zuordnung.
