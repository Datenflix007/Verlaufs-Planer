# Curriculum-Referenzdaten

## Grenzen der Datenarten

`src/data/curricula/` und `src/data/competencies/` enthalten versionierte, mitgelieferte Referenzdaten. Benutzer-Vorlagen, Planungen, Klassenkontexte und Fortschritt bleiben lokal und verweisen ausschliesslich ueber IDs auf diese Daten. Original-PDFs werden nicht mitverteilt.

## Quellen und Import

Die Quelle ist das Thueringer Schulportal, Bereich Lehrplaene fuer das Gymnasium. `sources.json` dokumentiert Herausgeber, URL, Abrufdatum, Version, SHA-256 und Hinweise zur Weiterverbreitung. Jede annotierte Kompetenz, jeder Lernbereich und jeder Inhaltspunkt enthaelt eine `sourceRef` bis mindestens zur PDF-Seite.

Importe werden gegen die PDF-Quelle strukturiert und anschliessend mit Zod, ID- und Referenztests validiert. Unsichere automatische Zuordnungen erhalten `reviewStatus: "needs-review"`; sie werden nicht als bestaetigte Fachinformation ausgegeben.

## Versionen und Geltung

Curriculum-IDs enthalten Fach und Version, etwa `th-gym-history-2021`. Eine neue Fassung ersetzt keine vorhandene Datei. `applicability` modelliert Klassenstufen, Schuljahre und Uebergangsphasen; die Registry bestimmt daraus die passende Fassung.

## Stabile IDs und Fortschritt

IDs entstehen aus Gebiet, Schulart, Fach, Version und hierarchischer Position, nicht aus dem Volltext. So bleibt eine gespeicherte Unterrichtsplanung referenzstabil. `CurriculumProgressEntry` ist lokale Benutzerdaten: Status wird niemals in die committed JSON-Dateien geschrieben. Coverage wird rein aus Curriculum plus Fortschritt berechnet.
