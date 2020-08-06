# Wachalarm IP-Web
![Titelbild Wachalarm IP-Web](https://user-images.githubusercontent.com/19272095/54090568-cbbe6d00-4375-11e9-937e-ae2a6cd9ea7a.jpg)

Wachalarm IP-Web ist ein Dienst, der auf jedem internetfähigem Endgerät - egal ob Windows, Linux, Mac oder Smartphone - Wachalarme anzeigen kann, ohne das zusätzliche Software zu installieren ist. Da es sich dabei um eine reine Web-Server-Anwendung handelt, sollte der Dienst am besten durch eine Leitstelle betrieben werden um die Einsatzalarme direkt an das System zu übergeben. Der Zugriff erfolgt innerhalb eines geschützten Netzwerkes (VPN, LAN etc.) oder direkt über das Internet (sofern freigegeben und gewollt).\
Der Web-Server empfängt Einsatzdaten über eine definierte Schnittstelle aus dem Einsatzleitsystem (oder auch von anderen Systemen) und übersendet diese dann an die jeweiligen verbunden Clients.

Mithilfe der eingebauten Rückmeldefunktion können Einsatzkräfte mitteilen ob Sie an einem Einsatz teilnehmen. Dabei wird die fachliche Qualifikation und wahrscheinliche Eintreffzeit übermittelt. Persönliche Daten (wie Name, Vorname etc.) werden nicht verarbeitet.

**Weitere Informationen zur Funktionsweise finden Sie im [Wiki](https://github.com/Robert-112/Wachalarm-IP-Web/wiki)**

# DEMO

Die Demo-Version zeigt frei erfundene Einsätze an, die jede Stunde neu alarmiert werden.

[📺🔥 https://wachalarm.mooo.com/](https://wachalarm.mooo.com/)

Login-Daten:
- Benutzer: me
- Passwort: 123

# Funktionsumfang (Auszug)
 - Anzeige verschiedener Wachalarme für einzelne Wachen, Träger oder ganze Kreise
 - Ausgabe synthetischer Sprachdurchsagen (Gong, Einsatzart, Stichwort, Ort, Ortsteile, beteiligte Einsatzmittel, Sondersignal)
 - Kartenmodul zur Anzeige des Einsatzortes
 - Responsive Webdesign - gleiche Anzeige des Wachalarms auf allen Geräten, Unterstützung von Hoch- und Querformat
 - Rechteverwaltung von Benutzern zur Sicht von Wachalarmen verschiedenster Wachen, Träger oder ganzer Kreise
 - Verschlüsselte Übertragung der Einsatzdaten über https und Websocket
 - Anzeige von reduzierten Alarmen bei fehlender Berechtigung  (Datenschutzoption) 
 - Steuerung der übermittelten Daten durch den Server - auf dem Client werden keine Daten gespeichert (außer dem Session-Cookie)
 - Volle kompatibilität mit den gängigen Browsern (getestet in Chrome, Firefox, Safari, Microsoft Edge)
 - Rückmeldefunktion (für Feuerwehren, gesteuert über externe Gruppenverwaltung)
 - Dashboard zur Einzeige des Gesamteinsatzes, inkl. aller Alarmierten Einsatzmittel und aller Einsatzrückmeldungen
 - Basierend auf modernsten Web-Technologien ([Node.js](https://nodejs.org/), [Express](https://expressjs.com/de/), [Socket.io](https://socket.io/), [Passport](http://www.passportjs.org/), [SQLite](https://www.sqlite.org/), [Bootstrap](https://getbootstrap.com/), [Leaflet](https://leafletjs.com/))


# Screenshots (Version 1.2)
### Startseite
![FireShot Capture 001 - Startseite - localhost](https://user-images.githubusercontent.com/19272095/54091416-0b8a5200-4380-11e9-8ecd-9125e033a5e3.png)
### Einsatz (Querformat)
![FireShot Capture 005 - Alarmmonitor - localhost](https://user-images.githubusercontent.com/19272095/54091420-0c22e880-4380-11e9-8fbd-a047d9fae63e.png)
### Einsatz (Hochformat)
![FireShot Capture 006 - Alarmmonitor - localhost](https://user-images.githubusercontent.com/19272095/54091415-0b8a5200-4380-11e9-800b-e34ad99eeae5.png)
### Bildschirmschoner
![FireShot Capture 002 - Alarmmonitor - localhost](https://user-images.githubusercontent.com/19272095/54091417-0b8a5200-4380-11e9-8775-e64f089c92e9.png)
### Login
![FireShot Capture 003 - Login - localhost](https://user-images.githubusercontent.com/19272095/54091418-0c22e880-4380-11e9-8657-5011db2435df.png)
### Benutzerverwaltung
![FireShot Capture 004 - Benutzer und Rechte verwalten - localhost](https://user-images.githubusercontent.com/19272095/54091419-0c22e880-4380-11e9-8677-b7f9db1a422d.png)
# Lizenz
#### [\[Creative Commons Attribution Share Alike 4.0 International\]](https://github.com/Robert-112/Wachalarm-IP-Web/blob/master/LICENSE.md)
