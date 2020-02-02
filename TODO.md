# Fehler und geplante Neuerungen

## 1. Priorität (Fehler)

- für jeden neuen Einsatz sollte eine UUID erstellt werden, die bei nachfolgen Alarmierungen verglichen wird (zur Vermeidung von doppelten Alarmierungen, falls über die Schnittstelle der Alarm nochmals gleichlautend übermittelt wird)
- Wachalarm-Besonderheiten-Text bei senden an bestehende Verbindung fehlerhaft (KW)
- Darstellung in Safari-Mobil fehlerhaft (generell Mobil, ggf. extra Darstellung)
- Buttons für Sounds werden fehlerhaft dargestellt
- Uhrzeit in der Datenbank (und im Log) ist auf UTC, sollte aber lokale Zeit sein

## 2. Priorität (notwendige Anpassungen)

- Mehr Informationen für angemeldete Benutzer ("Angemeldet als ...", Berechtigungen, etc.)
- Login verbessern:
	- Login-Seite benötigt Fehlerrückmeldung (wie Nutzerverwaltung): falsches Kennwort, Nutzer nicht vorhanden etc.
	- Login/Logout protokollieren
	- fehlerhafte/doppelte Logins protokollieren 
	- prüfen ob es sinnvoll ist, bereits eingeloggte User nicht mehr zulassen (Session prüfen)
	- bei fehlendem Login zur Login-Seite weiterleiten und nach dem Login die zuvor besuchte Seite anzeigen
- Information in Wachalarm-Bild ob alle Rechte, oder ob reduzierte Version
- ❗Benutzerrechte in Implizite (darf reduziert sehen) und Explizite (darf alles sehen) unterscheiden
- ❗/waip/0 umändern, so dass nur die Wachalarme angezeigt werden, für die man entsprechende rechte hat
- ❗/waip/einsatz-Id schaffen
- Seite mit aktiven Clients anpassen:
	- nicht zwingend als Tabelle, sondern eher als .col mit Buttons um Aktionen an Clients zu senden
	- einzelnen Client über Verwaltungsoberfläche neu laden lassen
- besserer Log-Status: Browserversion ermitteln, User ermitteln
- Uhrzeit am Anfang irgendwo platzieren (nicht immer oben links)
- Maus auf Alarmmonitor nach Zeit x ausblenden
- Datenbank nach bestimmter Zeit aufräumen
- Client-IP bei Reverse-Proxy richtig ermitteln
- eingehende JSON-Objekte auf plausibilität prüfen

## 3. Priorität (Neuerungen)

- Rückmeldefunktion für Einsatzkräfte
- Schnittstelle zu weiterem Wachalarm-Web-Server um Einsätze und Rückmeldungen untereinander auszutauschen
- Pakete aktualisieren
	- textfit aktualisieren

## 4. Priorität (zu späterer Zeit)

- anpassen der Durchsage je Benutzer, durch eigene Ersetzung und Reihenfolge
- Ausnahmen festlegen können, wann keine Musik abgespielt wird
- Indivduelle Texte für Web-Anwendung hinterlegen können:
	- "© Leitstelle Lausitz"
	- Impressium
	- Datenschutzerklärung
	- Titel der Anwendung
	- Versionsnummer
