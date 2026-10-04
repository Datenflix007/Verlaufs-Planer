# Arbeitsbereich-Prioritäten

## Zweck

Prioritäten ordnen offene Aufgaben sowie kommende eigene Planungen im Dashboard.
Sie verändern weder Termine noch Inhalte: Das Datum bleibt der Kalendereintrag,
die Priorität entscheidet nur über die Reihenfolge der beiden Vorschau-Widgets.

## Persistiertes Modell

Jede Definition im lokalen Arbeitsbereich besitzt eine stabile Kennung, ein
sichtbares Label und Icon sowie zwei Zahlen:

| Feld | Bedeutung |
| --- | --- |
| order | Gespeicherte Reihenfolge für Einstellungen und Wiederherstellung |
| weight | Effektive Dringlichkeit für die Dashboard-Warteschlange |

Die Standardreihenfolge ist Blitz (4), Hoch (3), Mittel (2), Kann warten (1).
Ältere Arbeitsbereiche ohne weight werden beim Lesen normalisiert. Bekannte
Standardkennungen erhalten ihr bisheriges Gewicht; andere Einträge erhalten ein
absteigendes Gewicht entsprechend ihrer gespeicherten Reihenfolge.

Die Reihenfolge wird im Arbeitsbereich per Drag-and-drop oder über
Pfeil-Schaltflächen verändert. Dabei werden order und weight gemeinsam neu
geschrieben: Die oberste Priorität erhält bei vier Einträgen Gewicht 4, die
letzte Gewicht 1. Der Arbeitsbereich speichert die Änderung entprellt.

## Gewichtete Warteschlange

prioritiseUpcoming verwendet einen binären Max-Heap. Für ein Element mit Datum
d und Gewicht w gilt:

    score = w * 100000 - min(Tage_bis_d, 99999)

Damit dominiert ein Gewichtsschritt stets den Datumsabstand; innerhalb derselben
Priorität steht der frühere Termin zuerst. Unbekannte oder fehlende
Prioritätskennungen nutzen Mittel als Fallback.

Das Dashboard verwendet diese Warteschlange nur für „Unterricht & Planungen“
und „Aufgaben“. Kalender, Tagesablauf und Terminraster bleiben chronologisch,
damit eine dringende, aber spätere Planung dort nicht den Zeitverlauf verfälscht.

## Zuordnung

- Aufgaben erhalten die Priorität beim Anlegen, in der Schnell-Erfassung und
  nachträglich in den Arbeitsbereichseinstellungen.
- Planungen erhalten sie beim Anlegen oder nachträglich unter
  „Allgemeine Angaben“ im Planeditor.
- Die Widgets zeigen neben dem Datum die gewählte Priorität an.

Die Kennung liegt lokal in PlannerTodo.priorityId beziehungsweise
WorkshopPlan.metadata.priorityId. Fehlende Kennungen bleiben rückwärtskompatibel
und werden als Mittel behandelt.

## Prüfabdeckung

- Domänentests prüfen Migration, Gewicht-vor-Datum und Neugewichtung nach
  Umordnung.
- Der Komponententest prüft die Prioritätsauswahl im Planeditor.
- Der Browsertest prüft zugängliche Umordnung, Autosave, Planpersistenz und
  gewichtete Reihenfolge beider Dashboard-Widgets.
