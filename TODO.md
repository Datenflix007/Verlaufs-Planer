# TODO

## Server-, Benutzer-, Team- und Sharing-Architektur

Die bestehende Anwendung bleibt ein modularer Monolith. Die folgenden Aufgaben ersetzen weder den lokalen SQLite-Standard noch die vorhandenen Repository-Verträge. Jede Freigabe wird serverseitig geprüft; Client-Sichtbarkeit ist keine Berechtigung.

- [x] SERVER-01 Bestehende Infrastruktur und Verträge für Local-, Netzwerk- und Serverbetrieb erfassen.
  - Ziel: Eine belastbare, additive Migrationsreihenfolge festlegen.
  - Betroffene Bereiche: Vite-API, Repository-Adapter, SQLite-Schema, Uploads, Routen und Startskripte.
  - Akzeptanzkriterien: Abhängigkeiten, Vertrauensgrenzen und Eigentumsbeziehungen sind dokumentiert; keine bestehende lokale Planung wird verworfen.
  - Tests: Bestehende Repository- und API-Tests bleiben grün.
  - Technische Notiz: Der Bestand und die klaren Vertrauensgrenzen sind in `docs/architecture/SERVER_DEPLOYMENT.md` festgehalten; die aktuelle Vite-API ist ausdrücklich noch kein produktiver Mehrbenutzer-Server.

- [x] SERVER-02 Zentrale, umgebungsbasierte Laufzeitkonfiguration einführen.
  - Ziel: Host, Port, Bind-Adresse, Datenbank- und Speicherpfad sowie optionale Base-URL ohne Hardcoding steuern.
  - Betroffene Bereiche: Vite-Konfiguration, Servermodule, Startskripte, `.env.example` und Dokumentation.
  - Akzeptanzkriterien: Lokaler Betrieb bleibt standardmäßig loopback-sicher; LAN-Betrieb über explizite Konfiguration möglich; ungültige Konfiguration wird verständlich abgelehnt.
  - Tests: Konfigurations-Unit-Tests und Start-/Build-Prüfung.
  - Technische Notiz: `server/config.ts` zentralisiert validierte Einstellungen und hält lokale Bindung standardmäßig auf `127.0.0.1`; 13 Konfigurations-/SQLite-Tests sowie `npm run check` bestanden.

- [x] SERVER-03 HTTP-API aus dem Vite-Entwicklungsserver in einen produktionsfähigen modularen Serveradapter überführen.
  - Ziel: Dieselben API-Routen im Development- und Startbetrieb betreiben können.
  - Betroffene Bereiche: Server-Bootstrap, API-Router, `npm run start`, Vite-Plugin.
  - Akzeptanzkriterien: Kein Produktionsbetrieb hängt an Entwicklungs-HMR; Reverse-Proxy-fähige Bindung ist dokumentiert.
  - Tests: API-Integrationstest und lokaler Starttest.
  - Technische Notiz: `server/api.ts` wird von Vite und `server/index.ts` genutzt; `npm run start` liefert nach dem Build SPA und API ohne HMR aus. Der isolierte API-Integrationstest sowie der lokale Start mit HTTP-Prüfung bestanden.

- [x] AUTH-01 Versioniertes User- und Rollenmodell mit deterministischer SQLite-Migration ergänzen.
  - Ziel: Lokale und spätere Serverkonten über dieselben Modelle abbilden.
  - Betroffene Bereiche: SQLite-Schema, Datenzugriff, Migrationen, Domänentypen.
  - Akzeptanzkriterien: Eindeutiger Login-Identifier, Anzeigename, aktiver Status, USER/ADMIN-Rolle sowie Zeitstempel; vorhandene Daten bleiben lesbar.
  - Tests: Migration gegen bestehende Datenbank und Repository-Tests.
  - Technische Notiz: `users` wird additiv mit eindeutiger, normalisierter Login-ID, Anzeigename, USER/ADMIN, Aktivstatus und Zeitstempeln angelegt. Eine befüllte Planungsdatenbank blieb im Migrationstest lesbar; 16 Server-/Konfigurationsfälle und der Typecheck bestanden.

- [x] AUTH-02 Sichere Passwortspeicherung mit Argon2id einführen.
  - Ziel: Keine Klartextpasswörter und keine selbst entworfene Kryptografie.
  - Betroffene Bereiche: Auth-Service, Umgebungsvariablen, SQLite.
  - Akzeptanzkriterien: Ausschließlich Argon2id-Hashes werden gespeichert; Verifikation und Passwortwechsel funktionieren; Geheimnisse stehen nicht im Repository.
  - Tests: Hash-/Verifikations- und Passwortwechseltests.
  - Technische Notiz: `PasswordService` verwendet die etablierte `argon2`-Bibliothek mit Argon2id, 19 MiB Arbeitsspeicher, zwei Iterationen und einem Parallelitätsgrad. Hash, Verifikation und Passwortwechsel wurden geprüft; 17 Server-/Konfigurationsfälle, Typecheck und Build bestanden.

- [ ] AUTH-03 Login, Logout und serverseitige Sessionverwaltung implementieren.
  - Ziel: Sicherer Sitzungslebenszyklus für Browserzugriffe.
  - Betroffene Bereiche: API, Session-Speicher, Cookie-Helfer, Client-Bootstrap.
  - Akzeptanzkriterien: Rotation beim Login, Ablauf, HTTP-only/SameSite-Cookies, HTTPS-Secure-Flag und Logout-Invalidierung sind umgesetzt.
  - Tests: Login, Fehlversuch, Ablauf, Logout und Session-Fixation als API-Tests.

- [ ] AUTH-04 Initialen lokalen Setup- und Admin-Flow bereitstellen.
  - Ziel: Einzelplatzbetrieb ohne unnötige Multi-User-Oberfläche starten können.
  - Betroffene Bereiche: Setup-Status, Auth-Routen, Einstiegssicht.
  - Akzeptanzkriterien: Erster lokaler Admin wird einmalig erstellt; Netzwerkmodus startet nicht still mit Standardkennwort.
  - Tests: Setup- und Wiederholungsfall im Browser/API-Test.

- [ ] AUTH-05 Zentrale Autorisierungsrichtlinien und Ressourcenbesitz einführen.
  - Ziel: Jede geschützte Ressource serverseitig gegen Nutzer und Rechte prüfen.
  - Betroffene Bereiche: Policy-Service, Plan-, Material-, Präsentations- und Schulplan-Repositories.
  - Akzeptanzkriterien: Manipulierte IDs liefern keine fremden Daten und erlauben keine fremden Änderungen.
  - Tests: Zwei-Nutzer-Positiv- und Negativtests pro Ressourcentyp.

- [ ] OWNERSHIP-01 Bestehende Planungen, Materialien, Muster und Präsentationsmedien mit Eigentümern migrieren.
  - Ziel: Lokale Bestandsdaten deterministisch dem lokalen Standardkonto zuordnen.
  - Betroffene Bereiche: SQLite-Migrationen und bestehende Tabellen.
  - Akzeptanzkriterien: Wiederholbare Migration ohne Datenverlust; neue Objekte erhalten `owner_id`, `created_by` und `updated_by` wo fachlich passend.
  - Tests: Migration einer befüllten Testdatenbank und Rückwärtskompatibilität.

- [ ] TEAM-01 Team- und Mitgliedschaftsmodell mit OWNER, ADMIN und MEMBER ergänzen.
  - Ziel: Gemeinsame Arbeitsräume minimal und erweiterbar abbilden.
  - Betroffene Bereiche: Schema, Team-Service, Policies.
  - Akzeptanzkriterien: Mitgliedschaften sind eindeutig, Rollen werden serverseitig geprüft, Teamlöschung ist geschützt.
  - Tests: Mitgliedschafts- und Rollenmatrix.

- [ ] SHARE-01 Allgemeines, referenzbasiertes VIEW/EDIT-Sharing-Modell implementieren.
  - Ziel: Freigaben kopieren keine Ressourcen und lassen sich auf Nutzer und Teams anwenden.
  - Betroffene Bereiche: Share-Tabelle, Policy-Service, Audit-Felder.
  - Akzeptanzkriterien: Private, Nutzer- und Teamfreigaben sind abbildbar; Entzug wirkt sofort.
  - Tests: Freigabe, Entzug, VIEW-vs-EDIT und unberechtigter Direktzugriff.

- [ ] SHARE-02 Planungen und Präsentationen in das Sharing-Modell einbinden.
  - Ziel: Stunden, Reihen, Workshops und Präsentationen sicher teilen.
  - Betroffene Bereiche: Plan-, Schulplan- und Präsentationszugriffe.
  - Akzeptanzkriterien: Bestehende Präsentationsarchitektur bleibt erhalten; editierbare Freigaben werden serverseitig erzwungen.
  - Tests: End-to-End-Freigabefälle mit zwei Nutzern.

- [ ] SHARE-03 Digitale Materialien und Uploads in das Sharing-Modell einbinden.
  - Ziel: Material-Metadaten und Binärinhalte nach denselben Rechteentscheidungen ausliefern.
  - Betroffene Bereiche: Material-Repository, Medienroute, Download-Antworten.
  - Akzeptanzkriterien: Kein Zugriff allein über erratene URL/ID; Datei-Metadaten werden nicht unnötig offengelegt.
  - Tests: Zugriffs- und Download-Autorisierungstests.

- [ ] LIBRARY-01 Bibliotheksansicht aus Eigentum und Freigaben ableiten.
  - Ziel: „Meine“, „mit mir geteilt“ und „Team“-Ressourcen ohne Duplikate darstellen.
  - Betroffene Bereiche: Abfrage-Service und Frontend-Navigation.
  - Akzeptanzkriterien: Jede Ressource erscheint über Referenzen nur einmal je sinnvoller Ansicht.
  - Tests: Repository- und Komponentenprüfung.

- [ ] STORAGE-01 Zentralen Storage-Service für hochgeladene Dateien einführen.
  - Ziel: Lokales Storage-Backend hinter einer austauschbaren Schnittstelle kapseln.
  - Betroffene Bereiche: Uploads, Medien, Pfadvalidierung und Konfiguration.
  - Akzeptanzkriterien: Kein Clientpfad wird übernommen; Namen werden normalisiert; Path Traversal ist ausgeschlossen; zukünftiger S3-Adapter ist ohne Fachlogikänderung möglich.
  - Tests: Dateinamen-, Größen-, MIME- und Traversal-Tests.

- [ ] DEPLOY-01 Raspberry-Pi-/LAN-Start und persistente Datenhaltung absichern.
  - Ziel: Linux/ARM64-kompatibler Betrieb mit konfigurierbarem Host, Port und persistenten Pfaden.
  - Betroffene Bereiche: Startskripte, Konfiguration, Node-Version, SQLite und Dokumentation.
  - Akzeptanzkriterien: `npm run start` ist dokumentiert; `0.0.0.0` ist opt-in; Datenbank und Storage liegen außerhalb von Build-Artefakten.
  - Tests: Konfigurations- und Startprüfung auf unterstützter Node-Version.

- [ ] DEPLOY-02 Backup-, Reverse-Proxy- und HTTPS-Betrieb dokumentieren.
  - Ziel: Spätere Servermigration ohne Umgestaltung der Kernlogik vorbereiten.
  - Betroffene Bereiche: README, Architektur- und Betriebsdokumentation.
  - Akzeptanzkriterien: Backup-Ziele, Base-URL, Cookie-HTTPS-Verhalten und Proxy-Header sind klar beschrieben.
  - Tests: Dokumentationsreview gegen die tatsächliche Konfiguration.

- [ ] SECURITY-01 Multi-User-Sicherheitsreview und Gesamtprüfung ausführen.
  - Ziel: Eigentum, Freigaben, Sessions, Uploads und Secrets gegen typische Umgehungen absichern.
  - Betroffene Bereiche: Gesamte Server-API und Deployment-Konfiguration.
  - Akzeptanzkriterien: Keine bekannten IDOR-, Session-, Path-Traversal- oder Klartextsecret-Probleme; offene externe Voraussetzungen sind explizit dokumentiert.
  - Tests: Typprüfung, Unit-, API-, Browser-, Migration-, Build- und Diff-Prüfung.

## Aktuelle Iteration: Durchscrollbares Planungsdokument

- [X] Bestehenden Planeditor, Abschnittsnavigation, Vorlagenfilter und automatisches Speichern für einen rückwärtskompatiblen Dokumentfluss erfassen; Typ- und Test-Baseline ausführen.
- [X] Alle aktivierten Planungsabschnitte als fortlaufendes, visuell dokumentartiges Formular mit klarer Lesereihenfolge rendern.
- [X] Linke Sprungmarken mit sanftem Zielscrollen, sichtbarem aktivem Abschnitt und Scroll-Spy für Vor- und Rückwärtsnavigation verbinden.
- [X] Responsive Ansicht, Tastaturfokus und reduzierter Bewegungsmodus absichern sowie Browser-, Typ-, Test-, Build- und Diff-Prüfungen ausführen.

## Aktuelle Iteration: Geführte Planung für Schule und Workshop

- [X] Bestehenden Aufsetzungs-, Reihen- und Einzelplanungsfluss sowie Datenmodell für Klassen, Workshop-Teilnehmende, Fächer und Lehrpläne erfassen und mit lokalen Beispieldaten durchspielen.
- [X] Einzelplanungen um einen kontextabhängigen Lern- bzw. Workshop-Kontext ergänzen und die Auswahl von Klasse/Lerngruppe, Fach sowie passendem Lehrplan ermöglichen.
- [X] Den gewählten Kontext von der Schuljahres- bzw. Reihenplanung bis in die Einzelplanung sichtbar übergeben und die nächste sinnvolle Aktion pro Schritt anbieten.
- [X] Den End-to-End-Ablauf für Workshop und Geschichte 8a/Vormärz automatisiert absichern sowie Typ-, Unit-, Browser-, Build- und Diff-Prüfungen ausführen.

## Aktuelle Iteration: Getrennte Arbeitsansichten am Verlaufsplan

- [X] Bestehende Planseitenleiste, Materialliste, eingebetteten Baukasten und Präsentationseinstiege auf ihren Moduswechsel prüfen.
- [X] Die linke Navigation auf Sprungmarken des Planungsablaufs reduzieren und die Materialliste als eigenständige Planfunktion erreichbar halten.
- [X] Digitalen Baukasten als separate, planbezogen gefilterte Ansicht öffnen und die Rückkehr zur Verlaufsplanung sichtbar machen.
- [X] Vorschau, Baukasten und Präsentation gegen Planungsmodus abgrenzen; Typ-, Unit-, Browser-, Build- und Diff-Prüfungen ausführen.

## Aktuelle Iteration: Natürlicher Verlaufsplan-Editor

- [X] Bestehende Tabellenstruktur, Layoutvarianten und Theme-Verhalten des Verlaufsplans gegen die sichtbaren Dichte- und Kontrastprobleme prüfen.
- [X] Den Verlaufsplan als klar gegliederte, phasenorientierte Arbeitsfläche polieren, ohne Zeit-, Phasen-, Handlungs- oder Materialdaten zu verändern.
- [X] Responsivität und Dark-Mode-Kontrast für Tabellenkopf, Zeilen, Eingabefelder und Aktionen angleichen.
- [X] Typ-, Unit-, Browser-, Build- und Diff-Prüfungen ausführen und die sichtbare Planbearbeitung absichern.

## Aktuelle Iteration: Mehrklassen- und Fachlehrplanfluss

- [X] Bestehende Klassen-Fach-Zuordnungen, Lehrplan-Layer und Reihenbezüge auf Mehrklassenfähigkeit prüfen.
- [X] Schuljahresplanung so erweitern, dass Klassen und Fachlehrpläne eindeutig klassenbezogen ergänzt und geöffnet werden können.
- [X] Lehrplan- und Reihenplanung mit klaren Klasse-Fach-Kontexten sowie Wechsel- und Rücksprungpfaden verbinden.
- [X] Mehrklassen- und Mehrfach-Zuordnung im Browser absichern; Typ-, Unit-, Build- und Diff-Prüfungen ausführen.

## Aktuelle Iteration: Kontrastpolitur im Schuljahres-Onboarding

- [X] Onboarding und vorhandene Appearance-Tokens gegen die sichtbaren Kontrastbrüche prüfen.
- [X] Onboarding-Oberflächen, Texte, Formulare, Fortschrittsanzeige und Statushinweise konsequent an die Theme-Tokens anbinden.
- [X] Typprüfung, Tests und Produktions-Build ausführen; Kontrastpolitur im Diff prüfen.

## Aktuelle Iteration: Anpassbare Arbeitsbereich-Prioritäten

- [X] Bestehende Aufgaben-, Planungs- und Arbeitsbereichsdaten, Persistenzpfade sowie Dashboard-Widgets analysieren und die Typ-/Test-Baseline ausführen.
- [X] Rückwärtskompatibles Prioritätsmodell mit Gewichtung und gespeicherter Reihenfolge für Arbeitsbereich, Aufgaben und Planungen definieren.
- [X] Prioritäten im Arbeitsbereich per zugänglicher Drag-and-drop-Reihenfolge bearbeiten und im vorhandenen Autosave speichern.
- [X] Priorität bei Aufgaben und Planungen erfassen sowie die gewichtete Reihenfolge in den passenden Dashboard-Widgets anzeigen.
- [X] Prioritäts-Heap und Gewichtung unter `konzept/` dokumentieren und Domain-, Komponenten- sowie Browserprüfungen ergänzen.
- [X] Vollständige Typ-, Test-, Browser-, Build- und Diff-Prüfungen ausführen und die TODO-Punkte abschließen.
  - Technische Notiz: `npm run check`, 132 Unit-/Komponententests, 24 Playwright-E2E-Tests, `npm run build` und `git diff --check` bestanden. Der Kalender-E2E-Fall wartet nun korrekt auf die substituierte Stunde statt bei noch ladendem Dashboard in den Folgeraum zu wechseln.

## Aktuelle Iteration: Persistente Präsentationseinstellungen

- [X] Temporäre Presenter-/Audience-Zustände, Persistenzmodell, Schema und bestehende Teststrecken analysieren; Typ- und Test-Baseline ausführen.
- [X] Rückwärtskompatible planbezogene Einstellungen für Stiftfarbe, Strichbreite und Leuchtstiftdauer definieren und validieren.
- [X] Die Presenter-Werkzeuge aus gespeicherten Einstellungen initialisieren und Änderungen sichtbar sowie über den vorhandenen Autosave persistieren; sitzungskritische Freigaben bewusst ausschließen.
- [X] Unit-, Komponenten-, Browser-, Typ-, Gesamt- und Build-Prüfungen ausführen sowie Dokumentation und TODO aktualisieren.

## Aktuelle Iteration: Eigenständiger Mindmap-Export

- [X] Bestehende Mindmap-Geometrie, Präsentations-Exportstrecke und Download-Mechanik analysieren; Typ- und Test-Baseline ausführen.
- [X] Deterministisches, eigenständiges SVG aus der gespeicherten Mindmap-Struktur erzeugen und daraus PNG/PDF ohne Änderung des Plan-Payloads ableiten.
- [X] SVG-, PNG- und PDF-Export im Mindmap-Bearbeitungsmodus sichtbar anbieten sowie klare Fehlerzustände ergänzen.
- [X] Unit-, Komponenten-, Browser-, Typ-, Gesamt- und Build-Prüfungen ausführen sowie Dokumentation und TODO aktualisieren.

## Aktuelle Iteration: Mindmap-Ast kopieren und einfügen

- [X] Mindmap-Modell, Ast-Duplikation, Editor-Interaktion und vorhandene Teststrecken analysieren; Typ- und Test-Baseline ausführen.
- [X] Eine strukturierte, ID-freie Ast-Zwischenablage mit neuen IDs, Kanten, Stilen, Bildern und Collapse-Zuständen beim Einfügen modellieren.
- [X] Sichtbare Kopieren-/Einfügen-Aktionen sowie Strg/Cmd+C und Strg/Cmd+V im Mindmap-Bearbeitungsmodus ergänzen, ohne Browserberechtigungen vorauszusetzen.
- [X] Unit-, Komponenten-, Browser-, Typ-, Gesamt- und Build-Prüfungen ausführen sowie Dokumentation und TODO aktualisieren.

## Aktuelle Iteration: Editor-Regressionen für Verlauf, Notizen und Übergänge

- [X] Bestehende Undo-/Redo-History, Notizeditor, Übergangs-Inspector und Testinfrastruktur analysieren; aktuelle Typ- und Unit-Baseline ausführen.
- [X] Komponentenregression für Rückgängig/Wiederholen einer sichtbaren Folienänderung ergänzen.
- [X] Komponentenregressionen für Sprechernotizen und Übergangstyp/-dauer mit Änderungsereignis ergänzen.
- [X] Vollständige Typ-, Unit-, Browser- und Build-Prüfungen durchführen und TODO-Status unmittelbar aktualisieren.

## Aktuelle Iteration: Präsentationsvorlagen

- [X] Bestehendes Präsentationsmodell, Folienlayouts, Themes, Persistenz und Editorablauf analysieren; Typ- und Test-Baseline ausführen.
- [X] Didaktisch nutzbare, versionstabile Gesamtvorlagen definieren und ausschließlich auf eine leere Startpräsentation anwenden, ohne vorhandene Folien oder Einstiegspunkte zu überschreiben.
- [X] Die Vorlagenauswahl mit verständlichem Sperrhinweis im Präsentationseditor zugänglich machen und die Auswahl im Plan-Payload persistieren.
- [X] Unit-, Browser-, Typ-, Gesamt- und Build-Prüfungen ausführen sowie Präsentationsdokumentation und TODO aktualisieren.

## Aktuelle Iteration: Interaktive Mindmap-Äste im Vortrag

- [X] Bestehende Collapse-Daten, Presenter-/Audience-Interaktion und Broadcast-Vertrag analysieren; Ausgangsprüfungen ausführen.
- [X] Eine klar erkennbare Auf-/Zuklapp-Aktion für Mindmap-Äste in der Referentenansicht ergänzen, ohne Knoten oder Verbindungen zu verändern.
- [X] Den Collapse-Zustand über den vorhandenen Präsentationskanal live synchronisieren und im lokalen Plan speichern.
- [X] Domain-, Komponenten-, Browser-, Typ-, Gesamt- und Build-Prüfungen ausführen sowie Dokumentation und TODO aktualisieren.

## Aktuelle Iteration: Abgeleiteter Lehrplanstatus

- [X] Reine, nachvollziehbare Statusableitung aus Reihenbezug, terminierten und durchgeführten Sequenzstunden modellieren.
- [X] Den abgeleiteten Status im Lehrplanviewer darstellen, ohne persönliche Lehrplanmarker stillschweigend umzuschreiben.
- [X] Die Durchführung auf Sequenzstunde und zugehörigen Termin konsistent fortschreiben sowie Domain-, Browser- und Build-Prüfungen ergänzen.

## Aktuelle Iteration: Kalender-Navigation zur Reihe

- [X] Die gewählte Sequenz-ID beim Öffnen einer Unterrichtsstunde aus dem Dashboard an die Reihenplanung übergeben.
- [X] Die Reihenansicht auf die übergebene Klasse/Fach-Reihe einstellen und deren Details öffnen.
- [X] Den navigierbaren Kalenderfluss im Browser sowie durch Typ- und Build-Prüfung absichern.

## Aktuelle Iteration: Unterrichtsübersicht im Dashboard

- [X] Kommende geplante Unterrichtsstunden neben bestehenden Verlaufsplänen im vorhandenen Dashboard-Widget ausweisen.
- [X] Den Fortschritt laufender Reihen anhand geplanter Sequenzstunden für Klasse und Fach sichtbar machen.
- [X] Browser-, Unit- und Build-Prüfung für die Schuljahresübersicht ergänzen.

## Aktuelle Iteration: Kalenderausnahmen im Dashboard

- [X] Geplante Sequenzstunden im Dashboard gegen fach- und slotbezogene Kalenderausnahmen projizieren.
- [X] Ausfälle sichtbar als entfallende Stunde, Vertretungen mit Ersatzzeit und übrige Ausnahmen ganztägig darstellen.
- [X] Dashboard-Kalender, Browser-Regression und Kalenderarchitektur nachvollziehbar prüfen.

## Aktuelle Iteration: Schuljahres-Onboarding

- [X] Geführten Einstieg für Bundesland, Schulart, Schuljahr, Klasse und Fachlehrplan auf der bestehenden Schulplanungs-API modellieren.
- [X] Nur verifizierte, zur Klassenstufe passende Thüringer Curricula zur Zuordnung anbieten und den Abschluss in Stundenplan oder Dashboard führen.
- [X] Wizard über Routing und Dashboard erreichbar machen, ohne die bestehende Schuljahresverwaltung zu ersetzen.
- [X] Browser- und Architekturprüfung ergänzen.

## Aktuelle Iteration: Lokale Reihenvorlagen

- [X] Lokales Vorlagenformat für Reihen, Lehrplan-/Kompetenzbezüge und didaktische Stundenstruktur definieren; Reflexionen, Termine und persönliche Detailpläne bewusst ausschließen.
- [X] Browser-lokale Speicherung und Wiederverwendung einer Reihenvorlage ergänzen, ohne Referenzcurricula oder lokale SQLite-Planbestände zu kopieren.
- [X] Die Aktionen „Reihe als Vorlage speichern“ und „Vorlage verwenden“ in der Reihenplanung zugänglich machen.
- [X] Domain-, Browser- und Architekturprüfung ergänzen und lokale Datenhaltung dokumentieren.

## Aktuelle Iteration: Transparenter Didaktik-Check

- [X] Reine, nachvollziehbare Regelprüfung für Lehrplanbezug, Kompetenzkonkretisierung, Stundenziel und digitalen Offline-Fallback modellieren.
- [X] Hinweise der geöffneten Reihe sichtbar und ohne automatische Qualitätsbewertung darstellen.
- [X] Domain- und Browser-Regressionen für Hinweise und erfüllte Bedingungen ergänzen.
- [X] Didaktikarchitektur und Qualitätsprüfung aktualisieren.

## Aktuelle Iteration: Didaktische Stundenhinweise

- [X] Optionale Daten für Differenzierung, digitale Werkzeuge, technische Voraussetzungen und Offline-Fallback an einer Sequenzstunde migrationssicher ergänzen.
- [X] Schema, Snapshot, Repository und HTTP-Validierung auf die neuen Daten ausrichten, ohne bestehende Verlaufsplan-JSONs anzutasten.
- [X] Die Angaben im Reihenplan bearbeiten, sichtbar zusammenfassen und beim Erstellen eines detaillierten Plans als didaktische Notiz übernehmen.
- [X] SQLite-, Browser- und Architekturprüfung ergänzen.

## Aktuelle Iteration: Reihenreflexion

- [X] Einen eigenständigen, migrationssicheren `SequenceReflection`-Datensatz für behandelte Inhalte, offene Bereiche, erneut aufzugreifende Kompetenzen, anzupassende Stunden und Materialhinweise modellieren.
- [X] Snapshot, Repository und validierte HTTP-Schnittstelle ergänzen, ohne Referenzcurricula oder vorhandene Reihen zu verändern.
- [X] Den Reihenabschluss in der Reihenplanung mit einer kompakten, zugänglichen Eingabemaske und Statusfortschreibung verfügbar machen.
- [X] SQLite- und Browser-Regressionen sowie die Reihenarchitektur dokumentieren und prüfen.

## Aktuelle Iteration: Curriculum-Importgrenze

- [X] Importvertrag für Quellen, Struktur, Kompetenzen, Referenzen und Validierung definieren.
- [X] Fehlende oder ungültige Quellen als nachvollziehbare Fehler melden, ohne Ersatzcurriculum zu erzeugen.
- [X] Bestehende verifizierte Thüringer Registry gegen den Importvertrag prüfen.
- [X] Tests und Architektur-Dokumentation ergänzen.

## Aktuelle Iteration: Durchführung und Reflexion

- [X] Bestehenden Abschluss- und Reflexionsfluss gegen die geforderten Reflexionsdimensionen abgleichen.
- [X] Strukturierte Felder für Zielerreichung, Abweichungen, Zeit, Klassennotizen, Wiederholung, Reihenwirkung und nächste Stunde migrationssicher ergänzen.
- [X] Abschlusswirkung auf Sequenz-, Termin- und persönlichen Lehrplanstatus nachvollziehbar speichern.
- [X] SQLite- und Browser-Regressionen sowie Architektur- und Qualitätsprüfung ergänzen.

## Aktuelle Iteration: Stundenplan und Kalenderausnahmen

- [X] Die vorhandenen relationalen Stundenplan-, Termin- und Ausnahme-Tabellen sowie Dashboard-Projektionen abgleichen.
- [X] Eine zugängliche Verwaltungsansicht für versionierte Stundenpläne, Fach-Slots und Kalenderausnahmen erstellen.
- [X] Änderungen ab Stichtag als neue Stundenplanversion anlegen, ohne vorhandene Termine umzuschreiben.
- [X] Ferien, Feiertage, Ausfälle und Vertretungen als explizite Kalenderausnahmen erfassbar machen.
- [X] Den Einstieg über Schuljahresverwaltung und Routing sichtbar machen, ohne Dashboard-Widget-Einstellungen zu duplizieren.
- [X] SQLite- und Browser-Regressionen für Version, Slot und Ausnahme ergänzen; Dokumentation und Prüfläufe aktualisieren.

## Aktuelle Iteration: relationale Reihenbezüge

- [X] Die bestehende Schuljahres-, Curriculum-, Reihen- und Terminarchitektur gegen die Implementierung abgleichen und die fehlenden relationalen Reihenbezüge präzise erfassen.
- [X] `SequenceCurriculumReference` und `SequenceCompetency` mit eindeutigen Schlüsseln, Fremdschlüsseln und Indizes in der bestehenden SQLite-Migration ergänzen.
- [X] Typen, Zod-Validierung, Repository und HTTP-API für beide Join-Entitäten ergänzen.
- [X] Beim Anlegen einer Reihe aus dem Lehrplan den ausgewählten Knoten und ausgewählte Kompetenzen als eigenständige Reihenbezüge speichern.
- [X] Lehrplan- und Kompetenzbezüge in der Reihen-Timeline sichtbar machen, ohne Referenzcurricula zu ändern.
- [X] SQLite-Regressionen für Persistenz, Kaskaden und die Trennung von Parallelklassen ergänzen.
- [X] Architektur- und Abschlussdokumentation aktualisieren sowie Typprüfung, Tests und Produktions-Build ausführen.

## Schuljahres-, Lehrplan- und Sequenzplanung (Großauftrag)

### 0. Bestandsaufnahme und Architektur

- [X] Vue/Vite-, Pinia-, Routing-, SQLite-, Dashboard-, Kalender-, Material- und Präsentationsarchitektur sowie bestehende Datenmigrationen analysieren.
- [X] Die vorhandenen, Zod-validierten Thüringer Referenzcurricula für Geschichte, Informatik und Medienbildung/Informatik einschließlich Quellen- und Importreport identifizieren.
- [X] Architekturentscheidungen und Abgrenzungen in den neun angeforderten `docs/architecture/`-Dokumenten festhalten.

### 1. Relationale Planungsgrundlage und Migration

- [X] Separaten relationalen SQLite-Bereich für Schuljahre, Klassen/Kurse, Fachzuordnungen, Annotationen, Reihen, Sequenzstunden und geplante Termine anlegen; bestehende Plan-JSONs unverändert erhalten.
- [X] Strikte TypeScript- und Zod-Domainmodelle für die neue Ebene sowie eine rückwärtskompatible Zuordnung vorhandener Workshops als `WORKSHOP`/`OTHER` implementieren.
- [X] Repositories, API-Routen, Indizes und migrationssichere Defaults implementieren.
- [X] Unit- und SQLite-Tests für Schuljahr, Klasse/Fach/Lehrplan-Zuordnung und Migration ergänzen.

#### 1.1 Bedienbare Schuljahresverwaltung

- [X] Eine zugängliche Oberfläche für Schuljahr, Klasse/Kurs und Fachlehrplan-Zuordnung auf Grundlage der neuen API implementieren.
- [X] Die verfügbaren verifizierten Curricula passend zu Klassenstufe, Fach und Thüringen zur Auswahl anbieten; nicht verfügbare Lehrpläne nicht vortäuschen.
- [ ] Die Verwaltungsoberfläche über Routing und Dashboard erreichbar machen und mit einer Komponentenprüfung absichern.

### 2. Lehrplan-Annotation und Jahresplanung

- [X] Pro Klassen-Fach-Zuordnung eine transparente Lehrplanabdeckung aus dokumentierten Statusmarkern anzeigen.
- [X] Lehrplankommentare im persönlichen Layer bearbeiten und löschen können.
- [X] Eine Jahresplanungsübersicht aus den gespeicherten Wochenmarkern im Curriculum-Viewer ableiten.
- [X] Wochenmarker pro Lehrplanknoten im persönlichen Annotation-Layer erfassen und im Viewer sichtbar machen.
- [ ] Klassenbezogenen Fortschritts-, Wochenmarker- und Kommentar-Layer getrennt von den unveränderlichen Referenzcurricula implementieren.
- [X] Curriculum-Status semantisch (vorgemerkt, geplant, behandelt, erneut aufgreifen) inklusive Text, Icon, ARIA und zentraler Farbtokens ableiten.
- [X] Curriculum-Viewer mit Quellenreferenz, Annotationsrandspalte, Jahresplanung und interaktiven Wochenmarkern implementieren.
- [ ] Tests für Parallelklassen-Trennung, Kommentare, Marker und Statusableitung ergänzen.
  - [X] SQLite-Regression für unabhängige Parallelklassen-Marker und editierbare Kommentare absichern.

### 3. Reihen- und Sequenzplanung

#### 3.1 Reihe aus Lehrplanbereich

- [X] Eine Sequenzstunde gezielt mit einem bestehenden detaillierten Verlaufsplan verknüpfen und ihre Planungsdaten übernehmen.
- [X] Reihenstunden als visuelle Sequenz-Timeline mit Terminstatus und offenen Planungslücken darstellen.
- [X] Eine Sequenzstunde in einen neuen detaillierten Verlaufsplan überführen und die Rückreferenz speichern.
- [X] Gespeicherte Reihen inklusive Sequenzstunden in einen anderen Klassen-Fachbereich kopieren.
- [X] Aus dem Curriculum-Viewer direkt eine Reihe erstellen und die Lehrplanmarkierung mit der gespeicherten Reihe verknüpfen.
- [X] Aus einer Lehrplanmarkierung eine gespeicherte Unterrichtsreihe mit Titel, Zeitraum, Leitfrage und Lehrplanreferenz anlegen.
- [X] Eine Sequenzansicht mit tatsächlich gespeicherten SequenceLessons und direktem Hinzufügen von Stunden bereitstellen.
- [ ] Reihenanlage und Sequenzstunden mit Domain- und Komponentenprüfungen absichern.
- [ ] TeachingSequence, Curriculum-/Kompetenzreferenzen und SequenceLesson als relationale Datenmodelle implementieren.
- [ ] Lehrplan-zu-Reihe-Workflow, hochwertige Sequenz-Timeline, Matrix-Ansicht und Klassenkopie implementieren.
- [X] Übernahme einer SequenceLesson in einen bestehenden detaillierten Verlaufsplan implementieren.
- [ ] Domain-, Repository- und Komponentenprüfungen für Reihen, Sequenzstunden und Datenübernahme ergänzen.

### 4. Stundenplan und Kalender

- [X] Sequenzstunden direkt mit einem gespeicherten Unterrichtstermin (Datum, Zeit, Unterrichtskontext) verknüpfen und Verschiebungen am Termin sichtbar machen.
- [ ] Versionierbaren Stundenplan, Kalenderausnahmen, Feiertage, Ferien, geplante Termine und Vertretungen modellieren.
  - [X] Relationale Grundlage für Stundenplanversionen und datumsbezogene Kalenderausnahmen implementieren.
- [ ] Sequenzstunden mit dem Kalender verbinden, Terminverschiebungen sichtbar machen und kalenderlesbare Daten bereitstellen.
- [X] Kalender- und Dashboardansichten um Klassen-, Fach-, Reihen- und Terminbezug erweitern.
- [ ] Tests für Stundenplanwechsel, Ausnahmen, Ferien und Terminzuordnungen ergänzen.

### 5. Durchführung, Reflexion und Verlaufsplan

- [X] Abschluss einer Sequenzstunde auf den verknüpften persönlichen Lehrplanstatus zurückführen.
- [X] Für eine Sequenzstunde den tatsächlichen Durchführungsstatus mit kurzer Reflexionsnotiz speichern.
- [ ] Abschlussstatus, Stunden- und Reihenreflexion sowie nachvollziehbare Auswirkungen auf den Lehrplanstatus implementieren.
- [ ] Bestehende Verlaufsplanung als zugängliche Kompakt-/Detail-Timeline weiterentwickeln, ohne Workshop- und Präsentationsabläufe zu brechen.
- [ ] Didaktische Hinweise, technische Voraussetzungen, Differenzierung, digitale Tools und Fallback-Plan schrittweise als optionale Daten ergänzen.

### 6. Import, Einstellungen und Onboarding

- [ ] CurriculumImporter-Schnittstelle, Quellennachweis und Fehlermeldung für nicht vorhandene offizielle Curricula vorbereiten, ohne Inhalte zu erfinden.
- [ ] Einstellungen für Schule, Bundesland, Schuljahr, Klassen, Fächer, Curricula und Stundenplan ergänzen.
- [ ] Onboarding-Workflow für die erste Schuljahresplanung ergänzen.

### 7. Abschluss, Qualität und Dokumentation

- [ ] Responsive, tastaturbedienbare und kontrastreiche UI mit reduzierter Bewegung umsetzen; Farbe nie als alleiniges Signal verwenden.
- [ ] Vollständige Typ-, Unit-, SQLite-, Browser- und Build-Prüfungen je Phase durchführen und TODO-Status erst danach aktualisieren.
- [ ] `IMPLEMENTATION_SUMMARY.md` mit Architektur, Migration, Tests, Einschränkungen und Roadmap vervollständigen.

## Widget-Vorlagen, Farbsets und elegante Zeitstrahlbearbeitung

- [X] Bestehende Widget-Datenmodelle, Editor- und Präsentationsrenderstrecken sowie Tests analysieren und Ausgangsprüfungen ausführen.
- [X] Wiederverwendbare Widget-Vorlagen und konfigurierbare Farbsets rückwärtskompatibel im Präsentationsmodell ergänzen.
- [X] Die Zeitstrahlbearbeitung als kompakte, klar gegliederte Inspector-Oberfläche mit schnell erreichbaren Vorlagen und Farbsets gestalten.
- [X] Vorlagen- und Farbset-Auswahl für alle unterstützten Widgets im Editor zugänglich machen und im Präsentationsfenster identisch rendern.
- [X] Unit-, Komponenten-, Typ-, Gesamt- und Build-Prüfungen ausführen und die TODO-Punkte nach erfolgreicher Prüfung abschließen.

## Zeitstrahl-Design und Mausrad-Zoom

- [X] Bestehende Zeitstrahl-, Zoom-, Pan- und Synchronisationsstrecken analysieren sowie Ausgangsprüfungen ausführen.
- [X] Zeitstrahl als hochwertige historische Ereignisachse mit klaren Karten, Jahresmarken und überlappungsfreier Bearbeitungsansicht gestalten.
- [X] Stufenloses Zoom per Mausrad in Referentenansicht und freigegebenem Präsentationsfenster ergänzen und synchronisieren.
- [X] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Historischer, live bearbeitbarer Zeitstrahl

- [X] Datenmodell, Zeitstrahl-Widget, Referentenansicht und Synchronisationskanal analysieren sowie Ausgangsprüfungen ausführen.
- [X] Historische Beispielereignisse mit echten Zeitpunkten als Ausgangszustand statt Ablaufphasen bereitstellen und alle Ereignisfelder editierbar halten.
- [X] Zeitstrahlbearbeitung in der Referentenansicht mit Hinzufügen, Löschen, Ausrichtung und direkter Synchronisierung ins Präsentationsfenster ergänzen.
- [X] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Live-Balkenvorschau für Abstimmungen in der Referentenansicht

- [X] Abstimmungsdaten, Referentensteuerung und bestehende Browser-/Komponententests analysieren sowie Ausgangsprüfungen ausführen.
- [X] Für jede Ja/Nein- und Mehrfachauswahl eine nur für Referierende sichtbare Live-Balkenvorschau mit Stimmen, Anteilen und Gesamtzahl ergänzen.
- [X] Sicherstellen, dass die Vorschau eingehende Stimmen sofort abbildet, ohne die Ergebnissperre im Präsentationsfenster aufzuheben.
- [X] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Einheitliche Folienformatierung in beiden Ansichten

- [X] Gemeinsame Canvas-Renderstrecke sowie Größen- und Skalierungsunterschiede in Referenten- und Präsentationsfenster analysieren und Ausgangsprüfungen ausführen.
- [X] Eine feste 1280×720-Entwurfsfläche im gemeinsamen Foliencanvas einführen, die nur als Ganzes auf die verfügbare Ansicht skaliert wird.
- [X] Presenter- und Audience-Ansicht einschließlich Zoom, Ink-Overlay und interaktiver Widgets auf das identische Layout prüfen.
- [X] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Ausschnitt per rechter Maustaste verschieben

- [X] Bestehende Zoom-, Pan- und Synchronisationsstrecke in Canvas, Referenten- und Präsentationsansicht analysieren sowie Ausgangsprüfungen ausführen.
- [X] Rechtsklick-Ziehen mit mausstreckenabhängiger, geglätteter Bewegung im gemeinsamen Foliencanvas umsetzen.
- [X] Pfeil-Schaltflächen entfernen und die aktualisierte Ausschnittposition zwischen Referent und Präsentationsfenster synchronisieren.
- [X] Komponenten-, Browser-, Typ-, Gesamt-, Build- und Diff-Prüfungen ausführen.

## Medien als lokale Kopie oder URL

- [X] Bestehende Medien-Auswahl, Präsentationselemente, SQLite-Persistenz und die API-Strecke analysieren sowie Ausgangsprüfungen ausführen.
- [X] Medienmodell und serverseitige Speicherung für Bilder und Videos als lokale, planbezogene Kopie ergänzen.
- [X] Bild- und Videoeinfügung über URL sowie per lokaler Datei in den Präsentationseditor integrieren.
- [X] Lokale Medien beim Laden und im Präsentationsfenster zuverlässig ausliefern und darstellen.
- [X] Abstimmungs-Widget für Ja/Nein und freie Auswahlmöglichkeiten mit Teilnehmenden-Klicks und erst nach Referentenfreigabe sichtbarem Ergebnis ergänzen.
- [X] Gezoomten Bildausschnitt in Referenten- und Präsentationsansicht per Richtungssteuerung synchron verschiebbar machen.
- [X] Schema-, Server-, Komponenten- und Browsertests sowie Typprüfung, Gesamttests, Build und Diff-Prüfung ausführen.

## Zeitstrahl-Widget, Schriftarten und Formen

- [X] Bestehendes Präsentationsmodell, Schema, Editor-Toolbar, Canvas und Tests analysieren sowie Ausgangsprüfungen ausführen.
- [X] Zeitstrahl-Datenmodell mit editierbaren Ereignissen, Duplizierung und Schema-Validierung ergänzen.
- [X] Zeitstrahl als sichtbares, editierbares Widget in Editor, Referenten- und Präsentationsansicht integrieren.
- [X] Schriftfamilien einschließlich Times New Roman und zusätzliche tatsächlich gerenderte Formen ergänzen.
- [X] Unit-, Komponenten- und Browsertests sowie Typprüfung, Gesamttests, Build und Diff-Prüfung ausführen.

## Beidseitige Mindmap-Hauptaeste

- [X] Bestehendes horizontales Mindmap-Automatiklayout und seine Knotenreihenfolge analysieren.
- [X] Hauptaeste links und rechts der Wurzel verteilen und Unteraeste auf ihrer jeweiligen Seite halten.
- [X] Layout-, Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Skalierbare Referentenfolie ohne Seitenscrollen

- [X] Verfuegbaren Vorschauplatz und Sprechernotizen in der Referentenansicht analysieren.
- [X] Automatische Anpassung an den verfuegbaren Platz sowie separate Vorschau-Verkleinerung und -Vergroesserung implementieren.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Nahtlose und live synchronisierte Leuchtspur

- [X] Fade-Fenster fuer eine optisch kontinuierliche Leuchtspur verdichten.
- [X] Laufende Stiftzuege mit stabiler ID waehrend des Zeichnens zwischen Referenten- und Präsentationsfenster uebertragen.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Magic-Pen-Charakter fuer den Leuchtstift

- [X] Bestehende lueckenlose Leuchtspur als Basis fuer eine mehrschichtige Lichtkante analysieren.
- [X] Farbsaum, Tinten-Kern und dezente Lichtkante ohne Filterartefakte rendern.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Lueckenlose Leuchtspur ohne Farbverdichtung

- [X] Teilpfade an gemeinsamen Kurvenpunkten statt an sichtbaren Referenzpunkten trennen.
- [X] Ueberzeichnete Segmentueberlappungen entfernen und die Tablet-Optik testen.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Tabletartige, nahtlose Leuchtspur

- [X] Bestehende getaktete Leuchtspur und die sichtbaren Kappen an Segmentgrenzen analysieren.
- [X] Leuchtspurpfade zu einer glatten Handschriftkurve verbinden und Segmentkappen unsichtbar machen.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserpruefungen ausfuehren.

## Elegante, getaktete Leuchtspur

- [X] Aktuelles Segment-Rendering und Filterartefakte analysieren sowie Ausgangstests ausführen.
- [X] Zeitlich getaktete, überlappende Leuchtspurabschnitte mit sanftem Ausfaden statt punktweiser Filterfragmente rendern.
- [X] Leuchtspur ohne harte Filterkanten visuell sowie mit Komponenten- und Browserprüfungen absichern.
- [X] Typprüfung, Gesamttests, Produktions-Build und Diff-Prüfung ausführen.

## Punktweises Verblassen des Leuchtstifts

- [X] Bestehenden Leuchtstift-Datenfluss und Ablaufzeiten analysieren sowie Ausgangstests ausführen.
- [X] Zeitstempel für während des Zeichnens erzeugte Punkte übertragen und jedes Leuchtstiftsegment individuell ausfaden.
- [X] Leuchtstiftspur erst entfernen, wenn ihr zuletzt gesetzter Punkt vollständig verblasst ist.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserprüfungen ausführen.

## Marker-Verblassen und klickbarer Radierer

- [X] Marker-Zeitsteuerung und Radierereingaben analysieren sowie Ausgangstests ausführen.
- [X] Markiererspur nach der einstellbaren Dauer zuverlässig in beiden Präsentationsfenstern entfernen.
- [X] Radierer so begrenzen, dass er nur bei linker gedrückter Maustaste auf einer Spur löscht, nie beim bloßen Überfahren.
- [X] Komponenten-, Typ-, Gesamt-, Build- und Browserprüfungen ausführen.

## Persistente und beidseitig synchronisierte Vortragszeichnungen

- [X] Bestehenden Zeichenkanal, Folienwechsel und Verbindungsaufbau analysieren; Ausgangstests ausführen.
- [X] Stift- und Markiererspuren pro Folie für die gesamte Vortragssitzung erhalten, statt sie beim Folienwechsel zu verwerfen.
- [X] Vollständige Zeichenschnappschüsse beim Verbinden übertragen und neue Stift- sowie Radieraktionen in beide Richtungen abgleichen.
- [X] Referentenaktion zum eindeutigen Löschen aller Zeichnungen der aktuellen Folie ergänzen.
- [X] Regressionstests, Typprüfung, Gesamttests und Produktions-Build ausführen.

## Mindmap-Neuverbindung und freigegebenes Live-Zeichnen

- [X] Auswahl und direkte Neuverbindung einzelner Mindmap-Knoten analysieren und implementieren, einschließlich Schutz vor Zyklen.
- [X] Radiergummi für Stift- und Leuchtstiftspuren in Referenten- und Präsentationsansicht implementieren.
- [X] Live-Spuren aus der Referentenansicht im Präsentationsfenster darstellen und eingehende Publikumsaktionen synchron halten.
- [X] Schalter in der Referentenansicht hinzufügen, der die Zeichenwerkzeuge im Präsentationsfenster pro Folie explizit freigibt.
- [X] Komponenten-, Typ-, Gesamt- und Build-Prüfungen ausführen.

## Presenter-Werkzeuge: Mindmap, Zoom und Live-Zeichnen

- [X] Bestehende Mindmap-, Presenter-, Audience- und Zeichenpfade analysieren sowie Typprüfung und Tests als Ausgangsbasis ausführen.
- [X] Mindmap-Knoten im Bearbeitungsmodus löschbar machen und dabei den Wurzelknoten schützen.
- [X] Stift- und Plenums-Zoom-Schaltfläche auf allen Vortragsfolien einheitlich oben rechts anordnen.
- [X] Unabhängigen Zoom nur für die Referentenansicht sowie synchronisierbaren Plenums-Zoom anbieten.
- [X] Mehrfarbige Stifte und einen konfigurierbar nach Sekunden verschwindenden Leuchtstift für Referierende bereitstellen und an das Publikum übertragen.
- [X] Komponenten-Tests, Typprüfung, Gesamttests und Produktions-Build ausführen.

## Mindmap live im Vortrag und Präsentationsexport

- [X] Aktuelle Präsentationsarchitektur, SQLite-Speicherweg und Exportmöglichkeiten prüfen; Typprüfung und Tests als Ausgangsbasis ausführen.
- [ ] Presenter-Werkzeug zum Bearbeiten der Mindmap auf der aktuellen Folie ergänzen, ohne andere Folienelemente oder stabile IDs zu verändern.
- [ ] Mindmap-Änderungen während des Vortrags zuverlässig in SQLite speichern und per BroadcastChannel live an Audience übertragen; Reload und Verbindungsaufbau berücksichtigen.
- [ ] Selbstständigen HTML-Export aller Folien mit Navigation und eingebetteten Medien implementieren.
- [ ] Direkten PDF-Export aller Folien implementieren und die Ausgabe visuell prüfen.
- [ ] Export-Einstiegspunkte im Präsentationseditor ergänzen und Fehlerzustände anzeigen.
- [ ] Unit-, Integrations- und Edge-Browsertests für Live-Bearbeitung, Synchronisierung, Speicherung und beide Exportformate ergänzen.
- [ ] Dokumentation aktualisieren, vollständige Tests, Typprüfung, Build und Browser-Workflow ausführen.

## Mindmap-Widget und Zweitbildschirm-Präsentation

- [X] Bestand, Persistenz, Editor, Presenter/Audience, vorhandene Tests und Browser-APIs prüfen; Ausgangstests ausführen.
- [X] Mindmap-Typen, validiertes JSON-Modell und stabile ID-Regeln ergänzen.
- [X] Knotenoperationen, Duplizierung, Astfarben und Tree-/Radial-Layout implementieren und testen.
- [X] Mindmap in Folien-Canvas und Toolbar integrieren; Bearbeitungsmodus mit Knoten, Shortcuts, Drag-and-drop, Bildquellen, Zoom/Pan und Eigenschaften anbieten.
- [X] Audience-/Presenter-Rendering für Mindmaps ohne Bearbeitungselemente prüfen.
- [X] Mehrbildschirm-Start mit Screen-Details-Erkennung, Auswahl und Popup-Fallback implementieren.
- [X] Vollbildversuch, Ein-Klick-Fallback, Statussynchronisierung und Trennungsbehandlung ergänzen und testen.
- [X] Mindmap- und Mehrbildschirm-Tests einschließlich Speicherung/Reload und Fehlerszenarien ergänzen.
- [X] Präsentationsdokumentation, Browsergrenzen und offene optionale Punkte aktualisieren.
- [X] Typprüfung, vollständige Tests, Build und Edge-UI-Workflow prüfen.
- [X] Optional: Mindmap-Äste während des Vortrags interaktiv aufklappen und per BroadcastChannel synchronisieren.
- [X] Optional: Knoten-Copy/Paste ergänzen.
- [X] Optional: Mindmap-Export nach SVG/PNG/PDF ergänzen.
- [X] Optional: Persistente Präsentationseinstellungen ergänzen.

## Regression: Präsentationseditor wieder bedienbar machen

- [X] Fehler beim Bearbeiten und Duplizieren mit reaktiven Präsentationsdaten reproduzieren.
- [X] Kopieren für Undo/Redo, Folien und Elemente korrigieren.
- [X] Regressionsfall mit reaktiven Daten testen.
- [X] Typprüfung, Tests und Build ausführen.
- [X] Editorablauf im Browser prüfen.

## Präsentationseditor – Ausbaustufe

- [X] Bestehende Präsentationskomponenten, Modell, Persistenz, Pointer-Interaktion und Tests analysieren.
- [X] Ausgangsprüfung mit Typprüfung, Tests und Produktions-Build durchführen.
- [X] Rückwärtskompatibles V3-Modell für Elementstile, Formen, Layouts, Hintergrund, Übergänge und lokale Bilddaten migrieren.
- [X] Dunkles Desktop-Editor-Grundlayout mit kompakter Kopfzeile, Canvas-Workspace, Folien-Thumbnails, Properties und Statusleiste umsetzen.
- [X] Toolbar mit Textvarianten, Bild-Upload, Formmenü, Layout, Design, Hintergrund, Duplizieren/Löschen, Zoom und kontextbezogenen Aktivzuständen umsetzen.
- [X] Inline-Textbearbeitung, umfangreiche Text-Eigenschaften, Auswahlrahmen und acht Resize-Handles implementieren.
- [X] Formen, Bild-Fit/Deckkraft/Eckenradius, Layer-Reihenfolge, Ausrichtung und Kontextmenü implementieren.
- [X] Nicht-destruktive Folienlayouts, Theme-Cards, Hintergrundfarbe/-bild und sichtbare Sprechernotizen implementieren.
- [X] Lokale Undo-/Redo-History, Tastaturkürzel, Vorschau und Folienlisten-Einstiegspunktindikatoren implementieren.
- [X] Einfache Folienübergänge und Präsentationsvorlagen funktionsfähig machen.
- [X] Tests für Undo/Redo, Sprechernotizen und Übergänge auf Komponentenebene ergänzen.
- [X] docs/PRESENTATION_MODE.md mit Editorarchitektur, Elementen, Layouts, History und Materialintegration ergänzen.
- [X] Priorität-4-Themen (Grid, MultiSelect, Crop, Tabellen, volle Materialbibliothek) als offene Ausbauschritte dokumentieren.
- [X] Typprüfung, Tests, Produktions-Build und Browserprüfung durchführen.

## Integrierter Präsentationsmodus

- [X] Bestehende Vue-Architektur, Planmodell, SQLite-Persistenz und vorhandene Material-Präsentationen analysieren.
- [X] Ausgangsprüfung mit Typprüfung, Tests und Produktions-Build durchführen.
- [X] Rückwärtskompatibles Präsentationsmodell mit stabilen Folien-IDs und Einstiegspunkten am Planmodell ergänzen.
- [X] Präsentations-Persistenz über den bestehenden atomaren SQLite-Plan-Payload und die V1-zu-V2-Migration implementieren.
- [X] Folien-CRUD (Erstellen, Duplizieren, Löschen, Sortieren) mit stabilen IDs und Broken-Link-Schutz implementieren.
- [X] Route, linke Hauptnavigation und Präsentations-Unternavigation ergänzen.
- [X] Präsentationseditor mit Folienleiste, Canvas und MVP-Elementen (Text, Bild, Form) implementieren.
- [X] Auswahl, Verschieben, Größenänderung, Löschen und Duplizieren von Canvas-Elementen implementieren.
- [X] Sprechernotizen, Themenauswahl und vorbereitete Unterbereiche für Vorlagen, Animation und Moderation ergänzen.
- [X] Präsentations-Einstiegspunkte an Verlaufsplanphasen erstellen, anzeigen, öffnen, neu zuweisen und entfernen können.
- [X] Presenter Console mit Verlaufsplan, aktueller/nächster Folie, Notizen, Timer und Tastatursteuerung implementieren.
- [X] Audience-Route/Fenster sowie BroadcastChannel-Synchronisation und Popup-Fallback implementieren.
- [X] Testfälle für stabile Folien-IDs, Einstiegspunkte, Löschverhalten und Präsentationskanal ergänzen.
- [X] Architektur, Datenfluss, Browser-Fallbacks und Migration in docs/PRESENTATION_MODE.md dokumentieren.
- [X] README um den Presentation-Mode-Überblick ergänzen.
- [X] Typprüfung, Tests, Produktions-Build und eine Browser-Prüfung des Kernworkflows durchführen.
- [X] Dashboard-Kopf analysieren und die zu entfernenden Texte lokalisieren.
- [X] „Lokaler Arbeitsbereich“, „Mein Dashboard“ und die Beschreibung entfernen; Untertitel unter „Verlaufsplaner“ ergänzen.
- [X] Typprüfung, Tests und Build ausführen.
- [X] Bestehende Aufgaben-, Planungs- und Arbeitsbereichsdaten für Prioritäten analysieren.
- [ ] Anpassbare Prioritäten mit Drag-and-drop-Reihenfolge und Migration im Arbeitsbereich implementieren.
- [ ] Priorität bei Aufgaben und Planungen erfassen sowie gewichtete Widget-Anzeige implementieren.
- [ ] Prioritäts-Heap und Gewichtung unter `konzept/` dokumentieren und Tests ergänzen.
- [ ] Typprüfung, Tests und Build ausführen.
- [X] Digitalen Baukasten analysieren und die rot markierten Navigations- und Hilfselemente identifizieren.
- [X] Baukasten auf eine fokussierte Arbeitsfläche reduzieren und die entfernten Bedienelemente aus der Oberfläche lösen.
- [X] Bearbeitbare Dokumente für Präsentationen, digitale Arbeitsblätter und Mindmaps mit Abschnitten implementieren.
- [X] Mehrseitige Präsentationen mit beliebig vielen Folien und Zuordnung zu Stundenabschnitten implementieren.
- [X] Baukasten-Änderungen automatisiert prüfen und die TODO-Liste abschließen.
- [X] Regression im digitalen Baukasten analysieren und die zuvor funktionierende Canvas-Ansicht wiederherstellen.
- [X] Nur die rot markierten Navigations-, Baustein- und Umschaltelemente aus der wiederhergestellten Canvas-Ansicht entfernen.
- [X] Wiederhergestellten Baukasten typprüfen, testen und bauen.
- [X] Zeichencodierung des digitalen Baukastens verlustfrei wiederherstellen und deutsche Texte prüfen.
- [X] Einen dokumentorientierten Editor für Präsentationen, Arbeitsblätter und Mindmaps ergänzen, ohne die Canvas-Ansicht zu ersetzen.
- [X] Dokumenteditor mit Folien, Abschnitten, Seiten und Mindmap-Knoten persistent machen und prüfen.
- [X] Direkte Einstiege zum Erstellen und Bearbeiten digitaler Materialien auf der Canvas ergänzen.
- [X] Einstieg typprüfen und die Nutzung dokumentieren.
- [X] Kalender-Monatszeilen dynamisch an die Widget-Höhe koppeln.
- [X] Typprüfung, Tests und Build ausführen.
- [X] Automatische, entprellte Speicherung für Änderungen im Dashboard-Editor ergänzen.
- [X] Typprüfung, Tests und Build ausführen.
- [X] Abstand, Einzug und Handschrift-Stil des Dashboard-Untertitels anpassen.
- [X] Typprüfung, Tests und Build ausführen.
