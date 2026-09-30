# Kalenderintegration

Das Dashboard legt geplante Sequenzstunden und Kalenderausnahmen nur zur Anzeige zusammen: Eine passende Ferien-, Feiertags- oder Ausfallsausnahme kennzeichnet die Stunde als entfallend; eine Vertretung zeigt die Ersatzzeit, sofern sie angegeben ist. Nicht auf einen vorhandenen Termin projizierbare Ausnahmen bleiben als ganztägige Kalendereinträge sichtbar. Eine Ausnahme passt entweder schuljahresweit, zum Fach/Kurs oder – bei hinterlegtem Slot – zu Fach/Kurs und gleicher Zeit. Damit bleiben Stundenplan, persönliche Sequenz und Dashboard-Kalender getrennte, nachvollziehbare lokale Datenbestände.

Dashboard und Kalender bleiben Projektionen aus lokalen Daten. Sie erhalten zusätzliche Ereignistypen für Sequenzstunden, geplante Unterrichtstermine, Ausnahmen und Vertretungen. Unterrichtstermine können verschoben werden, ohne die zugehörige Sequenz oder den Verlaufsplan zu verlieren.

Eine spätere ICS-Export- und Importgrenze arbeitet mit normalen Kalenderereignissen und ist bewusst vom UI entkoppelt. Externe Kalenderzugriffe sind kein Teil der lokalen Basisfunktion.
