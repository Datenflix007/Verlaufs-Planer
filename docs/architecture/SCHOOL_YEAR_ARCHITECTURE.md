# Schuljahresarchitektur

Die Schuljahresplanung ist eine zusätzliche, relationale Ebene neben bestehenden Workshop-Planungen. Bestehende `plans.payload`-Daten bleiben unverändert lesbar und werden nicht in ein neues JSON-Modell überführt.

`school_years` enthält ID, Bezeichnung, Bundesland, Schulart, Laufzeit, optionale Schule und Aktivstatus. `class_groups` gehören genau einem Schuljahr. `class_subject_assignments` verbinden Klasse, Fach und verifiziertes Curriculum eindeutig. Alle fachlichen Fortschrittsdaten referenzieren diese Zuordnung und sind deshalb zwischen Parallelklassen getrennt.

Bundesland und Schulart werden als Domainwerte zentral geführt. Provider für Ferien, Feiertage, Schularten und Curricula hängen daran; Komponenten enthalten keine `if state === 'TH'`-Sonderfälle.

Bestehende Planungen ohne neue Zuordnung bleiben gültig und erhalten den Kontext `WORKSHOP` oder `OTHER`.
