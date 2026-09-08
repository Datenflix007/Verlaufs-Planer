# Benutzer- und Datenmanagement

## Zweck

Der Verlaufs-Planer verarbeitet persoenliche Arbeitsdaten, Unterrichtsnotizen, Lerngruppeninformationen und perspektivisch sensible Reflexionsdaten. Deshalb muessen Benutzerverwaltung, Zugriffsschutz, lokale Speicherung, Backup und Export von Anfang an sauber geplant werden.

## Betriebsarten

### Lokaler Einzelplatz

Im ersten MVP kann die Anwendung lokal auf einem Geraet laufen. Ein Benutzerkonto schuetzt den Zugriff auf die lokale Arbeitsumgebung. Die Datenbank liegt als SQLite-Datei im lokalen App-Datenverzeichnis oder in einem konfigurierbaren Projektordner.

### Lokaler Netzwerkbetrieb

Bei Nutzung im lokalen Netzwerk greifen mehrere Personen auf denselben Server zu. Dann sind Rollen, Sessions, Passwortschutz, Backups und Zugriffstrennung Pflicht.

### Webbetrieb

Bei Betrieb unter einer URL muessen Mandanten, Datenschutz, HTTPS, sichere Cookies, Rate-Limits und Rollenmodell verbindlich umgesetzt werden.

## Benutzerkonten

Jede Person soll sich im jeweiligen System registrieren koennen:

- lokal: Konto gilt nur auf diesem Geraet oder dieser lokalen Installation
- Netzwerk: Konto gilt fuer die lokale Serverinstanz
- Web: Konto gilt fuer die gehostete Instanz

## Rollen

Fuer den MVP reicht ein einfaches Rollenmodell.

### `owner`

Die erste Person einer Installation. Darf Systemeinstellungen bearbeiten, Backups verwalten und andere Benutzer anlegen.

### `teacher`

Plant Reihen, Stunden, Workshops, Materialien und Notizen.

### `viewer`

Kann freigegebene Plaene ansehen und im Durchfuehrungsmodus nutzen, aber nicht alle Daten bearbeiten.

### `admin`

Perspektivische Rolle fuer Institutionen. Darf Vorlagen, Benutzer und gemeinsame Daten verwalten.

## Passwort- und Session-Sicherheit

Mindestanforderungen:

- Passwoerter niemals im Klartext speichern.
- Passwort-Hashes mit Argon2id oder einem vergleichbaren modernen Verfahren speichern.
- Session-Cookies `HttpOnly`, `SameSite` und im Webbetrieb `Secure` setzen.
- Loginversuche begrenzen.
- Passwort-Reset im lokalen MVP nur vorsichtig behandeln, weil es ohne Mailserver keinen sicheren Standardweg gibt.

## Datenklassen

### Systemdaten

- App-Version
- Datenbankversion
- aktivierte Kompetenzrahmen
- Bundesland, Schulform und Faecher
- lokale Einstellungen

### Benutzerdaten

- Name oder Anzeigename
- Login-Kennung
- Passwort-Hash
- Rolle
- Einstellungen

### Planungsdaten

- Reihen
- Einzelstunden
- Phasen
- Lernziele
- Kompetenzzuordnungen
- Materialien
- Exporte

### Reflexionsdaten

- Durchfuehrungsnotizen
- Zeitabweichungen
- Beobachtungen
- spaetere Verbesserungshinweise

### Quellen- und Kompetenzdaten

- importierte Fachlehrplaene
- Kompetenzrahmen
- Quellenmetadaten
- annotierte Textstellen

## Datenschutzprinzipien

- Lokale Daten bleiben lokal.
- LLM-Funktionen verwenden standardmaessig lokale Modelle.
- Externe KI- oder Cloud-Dienste duerfen nur nach bewusster Aktivierung genutzt werden.
- Jede Quelle fuer Kompetenzdaten muss nachvollziehbar bleiben.
- Personenbezogene Lerngruppendaten sollen minimiert werden.
- Exportdateien koennen sensible Informationen enthalten und muessen bewusst erzeugt werden.

## Backup und Wiederherstellung

Der MVP braucht einfache Backups:

- manuelles Backup der SQLite-Datei
- Export einer einzelnen Reihe oder Stunde
- Import eines zuvor exportierten Plans
- Hinweis vor Datenbankmigrationen

Spaeter:

- automatische lokale Backups
- verschluesselte Backups
- Organisationsbackup
- Wiederherstellung einzelner Planungen

## Technische Mindesttabellen

Siehe [`Datenmodell.md`](Datenmodell.md) fuer Details.

Fuer Benutzerverwaltung werden mindestens benoetigt:

- `users`
- `sessions`
- `roles` oder rollenbasierte Felder in `users`
- `user_settings`
- `audit_log` perspektivisch fuer Netzwerk- und Webbetrieb

## Offene Entscheidungen

- Muss der MVP bereits mehrere Benutzer unterstuetzen?
- Wird die lokale SQLite-Datei verschluesselt?
- Wo liegt das lokale App-Datenverzeichnis auf Windows, macOS und Linux?
- Wie werden Backups fuer nichttechnische Nutzende sichtbar gemacht?
