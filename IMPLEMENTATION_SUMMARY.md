# Implementierungsstand: Schuljahres-, Lehrplan- und Sequenzplanung

## Architektur

Die Vue-3-/Vite-Anwendung nutzt Pinia für vorhandenen UI-Zustand und lokale SQLite-Repositories über die Vite-API. Die Schuljahresplanung ergänzt die bestehenden Workshop- und Verlaufspläne; sie ersetzt sie nicht.

## Datenbankänderungen

Die relationale Planungs-Schicht umfasst Schuljahre, Klassen, Klassen-Fach-Zuordnungen, persönliche Lehrplanannotation und -kommentare, Reihen, Reihenstunden, konkrete Termine, Stundenplanversionen und Kalenderausnahmen. `sequence_curriculum_references` und `sequence_competencies` speichern Reihenbezüge auf stabile Curriculum-IDs statt Lehrpläne oder Reihen als JSON-Blobs abzulegen.

## Schuljahresplanung

`/schuljahr` legt Schuljahr, Klasse/Kurs und eine fach- sowie klassenstufengerechte, verifizierte Curriculumzuordnung an. Die Zuordnung ist pro Klasse und Schuljahr getrennt.

## Stundenplan

Die Datenbank trägt versionierte Stundenpläne, Slots und datumsbezogene Ausnahmen. Konkrete Reihenstunden können bereits direkt terminiert werden; eine vollständige Stundenplan-Verwaltungsoberfläche bleibt offen.

## Fachlehrplanviewer

`/lehrplan` verwendet die vorhandene, Zod-validierte Thüringer Registry. Geschichte, Informatik und Medienbildung und Informatik bleiben Quellreferenzen und werden nicht durch persönliche Planung geändert.

## Lehrplanannotation

Status, Kalenderwoche und Word-ähnliche Kommentare liegen ausschließlich in der persönlichen Klassen-Fach-Schicht. Parallelklassen erhalten getrennte Annotationen.

## Wochenplanung

Gespeicherte Wochenmarker werden als Jahresplanung nach Kalenderwoche angezeigt.

## Kommentare

Kommentare können angelegt, bearbeitet, erledigt und gelöscht werden, ohne Lehrplantext zu verändern.

## Unterrichtsreihen

Reihen haben einen persistenten Lehrplananker und optionale Kompetenzrollen. Diese Bezüge sind in der Reihenansicht sichtbar und werden bei einer Parallelklassenkopie unabhängig dupliziert.

## Sequenzplanung

`/reihen` zeigt Reihenstunden als Timeline, erlaubt Termine, die Verknüpfung oder Neuanlage detaillierter Verlaufspläne sowie die Durchführungsreflexion.

## Einzelstundenplanung

Eine bewusste Aktion überführt Daten einer Reihenstunde in einen bestehenden, detaillierten Verlaufsplan. Workshops und unzugeordnete bestehende Pläne bleiben kompatibel.

## Verlaufsplan-Redesign

Die bestehende Verlaufsplan-, Material- und Präsentationsfunktion wurde nicht umgebaut. Ein umfassender Kompakt-/Detail-Timeline-Redesign ist noch nicht Teil der Schuljahres-Schicht.

## Didaktische Funktionen

Lernziel, Leitfrage, Inhalte, Methoden, Material- und Didaktiknotiz werden für Reihenstunden gespeichert. Erweiterte strukturierte Didaktikchecks, digitale Tools und Fallback-Pläne sind als nächste Ausbaustufe dokumentiert.

## Tests

Typprüfung, 105 Unit-/SQLite-Tests und Produktions-Build wurden nach der relationalen Reihenreferenz-Erweiterung erfolgreich ausgeführt. Die SQLite-Tests decken insbesondere Persistenz, Kaskaden und Parallelklassen-Trennung ab.

## Migration

Neue Tabellen werden mittels `CREATE TABLE IF NOT EXISTS` ergänzt. Vorhandene `plans.payload`-Daten bleiben unangetastet; bestehende Pläne erhalten nur einen kompatiblen `WORKSHOP`-Kontext.

## Bekannte Einschränkungen

Onboarding, ICS, vollständige Stundenplanverwaltung, externe Vertretungsanbieter, alle didaktischen Detailmodelle und eine Browser-End-to-End-Prüfung des neuen Reihenbezugs sind noch offen. Sie werden nicht als fertige Funktionen dargestellt.

## Future Roadmap

Als Nächstes: Stundenplan- und Ausnahmenverwaltung, regelbasierte Terminvorschläge mit Bestätigung, Matrix-/Druckansicht, optionale Didaktikdaten und ein vollständig getesteter Onboarding-Workflow.
