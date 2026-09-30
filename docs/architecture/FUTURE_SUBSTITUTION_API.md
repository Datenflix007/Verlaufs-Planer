# Künftige Vertretungs-API

Vertretungen werden lokal als `substitution_records` mit Datum, Klassen-Fach-Zuordnung, ersetztem Termin, Status, Vertretungshinweis und optionalem Plan gespeichert. Die Domänengrenze ist ein Adapter, der später Daten aus einem Schulverwaltungssystem importieren kann.

Die erste Implementierung bleibt offline und erzeugt keine externe Synchronisation. Datenschutz, Authentifizierung, Berechtigungen, Konfliktauflösung und importierte Fremd-IDs werden vor einer echten Integration spezifiziert.
