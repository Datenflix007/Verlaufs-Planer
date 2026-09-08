# Datenmodell

## Zweck

Das Datenmodell beschreibt die zentralen Entitaeten des Verlaufs-Planers. Es ist noch kein finales Datenbankschema, aber die Begriffe und Beziehungen sollen stabil genug sein, damit Entwickler und LLM-Agenten darauf aufbauen koennen.

## Grundsaetze

- SQLite ist die primaere Datenbank fuer den MVP.
- Jede Hauptentitaet bekommt eine stabile ID.
- Zeitstempel fuer Erstellung und letzte Aenderung sind Standard.
- Fachliche Vorlagen werden versioniert.
- Quellenbezuege bleiben erhalten.
- Gueltigkeit von Fachlehrplaenen wird strukturiert nach Schuljahr und Klassenstufe modelliert.
- Klassen- und Lerngruppenplanung verbindet Fach, Wochenstunden, Lehrplanfassung, Reihen, Stunden und Kompetenzabdeckung.
- Loeschen sollte bevorzugt als Archivierung umgesetzt werden, wenn Daten historisch relevant sind.

## Kernentitaeten

### `users`

Speichert Benutzerkonten.

Wichtige Felder:

- `id`
- `display_name`
- `login_name`
- `password_hash`
- `role`
- `created_at`
- `updated_at`

### `user_settings`

Speichert persoenliche Einstellungen.

Wichtige Felder:

- `id`
- `user_id`
- `default_state`
- `default_school_type`
- `default_subject`
- `enabled_frameworks`

### `class_groups`

Speichert Klassen, Kurse oder Lerngruppen.

Wichtige Felder:

- `id`
- `owner_user_id`
- `name`
- `school_year`
- `state`
- `school_type`
- `grade_level`
- `description`
- `created_at`
- `updated_at`

### `class_subject_allocations`

Speichert, welches Fach in einer Klasse mit wie vielen Wochenstunden geplant ist.

Wichtige Felder:

- `id`
- `class_group_id`
- `subject`
- `school_year`
- `weekly_lessons_count`
- `lesson_duration_minutes`
- `valid_from_date`
- `valid_until_date`
- `curriculum_source_id`
- `notes`

### `plan_models`

Speichert bearbeitbare Verlaufsplan-Modelle.

Wichtige Felder:

- `id`
- `owner_user_id`
- `name`
- `description`
- `visibility`
- `active_version_id`
- `archived_at`

### `plan_model_versions`

Speichert unveraenderliche Modellversionen.

Wichtige Felder:

- `id`
- `plan_model_id`
- `version_number`
- `schema_json`
- `created_at`

### `phase_types`

Speichert Phasentypen wie Einstieg, Erarbeitung, Sicherung oder Reflexion.

Wichtige Felder:

- `id`
- `model_version_id`
- `name`
- `description`
- `default_duration_minutes`
- `sort_order`

### `series`

Speichert Reihenplanungen oder Workshopreihen.

Wichtige Felder:

- `id`
- `owner_user_id`
- `class_group_id`
- `title`
- `description`
- `context_type`
- `state`
- `subject`
- `school_type`
- `grade_level`
- `start_date`
- `end_date`

### `lessons`

Speichert Einzelstunden oder Workshopmodule.

Wichtige Felder:

- `id`
- `series_id`
- `owner_user_id`
- `class_group_id`
- `model_version_id`
- `title`
- `planned_date`
- `duration_minutes`
- `learning_goal`
- `expected_result`
- `notes`

### `lesson_phases`

Speichert Phasen innerhalb einer Stunde.

Wichtige Felder:

- `id`
- `lesson_id`
- `phase_type_id`
- `sort_order`
- `start_minute`
- `duration_minutes`
- `goal`
- `teacher_activity`
- `learner_activity`
- `method`
- `social_form`
- `materials`
- `expected_result`
- `notes`
- `custom_fields_json`

### `curriculum_sources`

Speichert Quellen fuer Lehrplaene und Kompetenzrahmen.

Wichtige Felder:

- `id`
- `source_type`
- `title`
- `publisher`
- `state`
- `subject`
- `school_type`
- `year`
- `url`
- `local_path`
- `license_note`
- `import_status`
- `validity_summary`

### `curriculum_validity_rules`

Speichert Gueltigkeits-, Inkraftsetzungs- und Auslaufangaben fuer Fachlehrplaene.

Diese Tabelle ist notwendig, weil ein Lehrplan nicht einfach pauschal gueltig oder ungueltig ist. Eine Fassung kann zum Beispiel im Schuljahr `2026/27` fuer Klassenstufe `5`, `7`, `11` und `12` in Kraft treten, waehrend eine andere Fassung fuer einzelne Klassenstufen noch auslaeuft.

Wichtige Felder:

- `id`
- `source_id`
- `rule_type`
- `school_year`
- `grade_level`
- `valid_from_date`
- `valid_until_date`
- `source_text`
- `source_page_url`
- `review_status`
- `created_at`

### `competencies`

Speichert einzelne Kompetenzen.

Wichtige Felder:

- `id`
- `source_id`
- `framework`
- `state`
- `subject`
- `school_type`
- `grade_level`
- `competency_area`
- `content_area`
- `text`
- `source_reference`
- `review_status`

### `lesson_competencies`

Verknuepft Stunden mit Kompetenzen.

Wichtige Felder:

- `id`
- `lesson_id`
- `competency_id`
- `relevance`
- `note`

### `class_curriculum_coverage_marks`

Speichert Markierungen in der Klassenuebersicht. Eine Markierung sagt, wann eine Kompetenz, ein Kompetenzschwerpunkt oder ein Lernziel fuer eine Klasse geplant, begonnen, behandelt, gesichert oder reflektiert wurde.

Wichtige Felder:

- `id`
- `class_group_id`
- `subject_allocation_id`
- `curriculum_source_id`
- `competency_id`
- `series_id`
- `lesson_id`
- `lesson_phase_id`
- `learning_goal`
- `coverage_status`
- `school_week`
- `planned_date`
- `taught_date`
- `planned_minutes`
- `actual_minutes`
- `weekly_lessons_count`
- `source_note`
- `created_at`
- `updated_at`

### `materials`

Speichert Materialien oder Verweise.

Wichtige Felder:

- `id`
- `owner_user_id`
- `title`
- `material_type`
- `path_or_url`
- `description`
- `created_at`

### `run_sessions`

Speichert eine konkrete Durchfuehrung eines Plans.

Wichtige Felder:

- `id`
- `lesson_id`
- `started_at`
- `ended_at`
- `mode`
- `total_time_delta_minutes`

### `run_events`

Speichert Ereignisse waehrend der Durchfuehrung.

Wichtige Felder:

- `id`
- `run_session_id`
- `lesson_phase_id`
- `event_type`
- `event_time`
- `note`

### `reflection_notes`

Speichert Auswertungs- und Beobachtungsnotizen.

Wichtige Felder:

- `id`
- `lesson_id`
- `run_session_id`
- `author_user_id`
- `note_type`
- `text`
- `created_at`

### `llm_suggestions`

Speichert optional KI-generierte Vorschlaege.

Wichtige Felder:

- `id`
- `user_id`
- `context_type`
- `context_id`
- `provider`
- `model_name`
- `prompt_hash`
- `suggestion_json`
- `accepted_at`
- `rejected_at`
- `created_at`

## Beziehungen

```text
users 1--n series
users 1--n lessons
users 1--n class_groups
class_groups 1--n class_subject_allocations
class_groups 1--n series
class_groups 1--n lessons
class_groups 1--n class_curriculum_coverage_marks
class_subject_allocations 1--n class_curriculum_coverage_marks
series 1--n lessons
plan_models 1--n plan_model_versions
plan_model_versions 1--n lessons
lessons 1--n lesson_phases
lessons n--m competencies ueber lesson_competencies
lessons 1--n class_curriculum_coverage_marks
lesson_phases 1--n class_curriculum_coverage_marks
curriculum_sources 1--n competencies
curriculum_sources 1--n curriculum_validity_rules
curriculum_sources 1--n class_curriculum_coverage_marks
lessons 1--n run_sessions
run_sessions 1--n run_events
lessons 1--n reflection_notes
```

## JSON-Felder

JSON-Felder sind fuer flexible Modellinhalte erlaubt, aber nur an klar begrenzten Stellen:

- `plan_model_versions.schema_json`
- `lesson_phases.custom_fields_json`
- `llm_suggestions.suggestion_json`
- `user_settings.enabled_frameworks`
- optional `curriculum_sources.validity_summary` fuer nicht normalisierte Originalhinweise

Kernfelder wie Zeit, Titel, Ziel und Kompetenzbezug duerfen nicht nur in JSON versteckt werden.

## Validierungsregeln

- `lessons.duration_minutes` muss groesser als 0 sein.
- Summe der Phasendauern soll gegen `lessons.duration_minutes` validiert werden.
- Jede `lesson_phase` gehoert zu genau einer `lesson`.
- Jede `lesson` referenziert eine konkrete `plan_model_version`.
- Jede Kompetenzzuordnung referenziert eine existierende Kompetenz.
- Importierte Kompetenzdaten behalten Quellenstatus und Reviewstatus.
- Wenn fuer eine Quelle Gueltigkeitsregeln existieren, soll die App bei Unterrichtsplanung gegen Schuljahr und Klassenstufe validieren.
- Bei fehlenden Gueltigkeitsregeln darf die App keine falsche Sicherheit anzeigen; der Status muss als unbekannt sichtbar bleiben.
- Jede Klassenuebersichts-Markierung muss mindestens auf Klasse, Fachbelegung, Status und einen nachvollziehbaren Planungs- oder Kompetenzbezug verweisen.
- Wochenstunden in `class_subject_allocations` muessen groesser als 0 sein.
- Wenn eine Markierung als `covered`, `secured` oder `reflected` gespeichert wird, soll sie nach Moeglichkeit auf eine durchgefuehrte Stunde oder Phase verweisen.

## Offene Entscheidungen

- Sollen IDs UUIDs oder SQLite Integer-IDs sein?
- Wie werden Mandanten fuer spaeteren Webbetrieb vorbereitet?
- Welche Felder muessen im MVP direkt relationale Spalten sein?
- Welche Archivierungsregeln gelten fuer geloeschte Reihen und Stunden?
- Wie fein muessen Gueltigkeitsregeln Klassenstufen, Kurshalbjahre, Einfuehrungsphase und Qualifikationsphase unterscheiden?
- Sollen Klassenuebersichts-Markierungen automatisch aus Stundenkompetenzen entstehen oder erst nach Nutzerbestaetigung?
