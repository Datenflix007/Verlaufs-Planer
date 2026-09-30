# Didaktikarchitektur

Didaktische Daten sind optionale, strukturierte Ergänzungen einer Sequenz oder Stunde: Lernziele, Wissensarten, kognitive Niveaus, Differenzierung, technische Anforderungen, digitale Tools, Fallback und Phasenübergänge.

Für die vorhandene Sequenzplanung werden `differentiation`, `digitalTools`, `technicalRequirements` und `fallbackPlan` direkt an `sequence_lessons` gespeichert. Die additive SQLite-Migration lässt vorhandene Stunden unverändert. Beim bewussten Erzeugen eines neuen Detailplans werden vorhandene Angaben zusammen mit der didaktischen Notiz als dessen `didacticAnalysis` übernommen; ein bereits verknüpfter Plan wird nicht stillschweigend überschrieben.

Der Didaktik-Check gibt nachvollziehbare Hinweise, keine automatischen Qualitätsurteile. Beispiel: fehlender Lehrplanbezug, nicht konkretisiertes Lernziel oder digitales Tool ohne Offline-Alternative.

`didacticChecksForSequence` ist eine reine Domain-Funktion und prüft nur dokumentierbare Voraussetzungen: Lehrplan- und Kompetenzbezug der Reihe, konkrete Lernziele und Kompetenzfoki der Stunden sowie Offline-Fallbacks für digitale Werkzeuge. Die Reihenansicht zeigt die Ergebnisse mit Text und Dringlichkeitslabel; bei erfüllten Bedingungen zeigt sie explizit den vollständigen Dokumentationsstand.

Die Kohärenzansicht visualisiert Lehrplan → Kompetenz → Reihe → Stundenziel → Aufgabe → Ergebnissicherung. Sie erklärt Verbindungen, ohne fachliche Qualität zu bewerten.
