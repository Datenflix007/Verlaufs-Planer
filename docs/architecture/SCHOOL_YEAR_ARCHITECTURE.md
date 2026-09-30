# Schuljahresarchitektur

Die Schuljahresplanung ist eine zusätzliche, relationale Ebene neben bestehenden Workshop-Planungen. Bestehende `plans.payload`-Daten bleiben unverändert lesbar und werden nicht in ein neues JSON-Modell überführt.

`school_years` enthält ID, Bezeichnung, Bundesland, Schulart, Laufzeit, optionale Schule und Aktivstatus. `class_groups` gehören genau einem Schuljahr. `class_subject_assignments` verbinden Klasse, Fach und verifiziertes Curriculum eindeutig. Alle fachlichen Fortschrittsdaten referenzieren diese Zuordnung und sind deshalb zwischen Parallelklassen getrennt.

Bundesland und Schulart werden als Domainwerte zentral geführt. Provider für Ferien, Feiertage, Schularten und Curricula hängen daran; Komponenten enthalten keine `if state === 'TH'`-Sonderfälle.

Bestehende Planungen ohne neue Zuordnung bleiben gültig und erhalten den Kontext `WORKSHOP` oder `OTHER`.

Der Einstieg `/einrichtung` ist ein geführter, optionaler Onboarding-Flow. Er verwendet dieselben validierten Speicheroperationen wie die Schuljahresverwaltung, bietet ausschließlich verfügbare verifizierte Thüringer Curricula an und legt nach ausdrücklichem Abschluss Schuljahr, Klasse und eine Klassen-Fach-Zuordnung an. Danach führt er zu Stundenplan oder Dashboard; die ausführliche Verwaltung unter `/schuljahr` bleibt unverändert verfügbar.
