# Konzept



## Über dieses Projekt 

## Stakeholder-Gruppen 

- A: Referenten, die Workshops (eintägig, oder mehrtätig) planen und dann eher EU Digiz. Kompetenzen oder Erste Hilfe Kompenzen oder was auch immer planen umzusetzen
- B: Lehrkräfte, die pro Schuljahr für ihre Klassen Reihenplanungen und Einzelnplanungen machen können


## Ausrollbarkeit

-> soll lokal auf einem Device laufen können

-> soll aber auch perspektivisch in einem netzwerk übereine IPv4 Adresse erreichbar sein

-> oder aber auch perspektivisch über eine URL erreichbar sein können 



## Methodisch-Didaktische Ansprüche

- es sollen von dem Nutzer  eigene  Verlaufsplan-Modelle eingepflegt werden -> dazu soll es in der Datenbank (hier primär eine .sqlite DB) eine tabelle geben
- standartmäßig sollen der kommunikationsorienterte und das Lernstandsorientierte Modell hinterlegt sein
- in der Reihenplanung soll man die Kometenzschwerpunkte aus den Fachlehrlänen umsetzen könen und dann für die für die stunden umsetzen können
- es soll eine gewisse vorauswahl von unterrichtsphasne geben: man soll aber selber noch welche hinzufügen können
- später in der entwicklung soll man mit einem lokalen LLM Modell sich auhc bei der UNterrichtsgestaltung helfen könenn und Phasen und Methoden vorschlagen können
- bei der PLanung im Editor einer stunde soll man auch intuitiv on der UI von hinten sozusagen von dem Stundenergbnis her planen können mit den Lernzielen
- WICHTIG sind dabei die Lernziele zu erfüllen
- Funktionen
  - Verlaufsplan als PDF exportieren können
  - Verlaufsplan im Durchführungsmodus live ansehen lassen und entweder zeitgesteuert oder durch WEITER antippen weiter im Plan; bei dem manuellen modus wäre es auch gut, wenn man sich gleich notzien über beobachtungen im verlauf machen kann
  - generell soll man zu jedem Verlaufsplan sich notzien machen, wo etwa zeiutlich etwas in der Planung nicht aufging -> nice wäre mit LLM unterstützung das bei späteren Planugng immer als hinweis zu bekommen
  - später im Entwicklungsprozess wäre es auch, wenn man entsrechend der Planung dann auch Arbeitsblätter oder .html oder h5p Dateien über das tool bauen lassen kann
