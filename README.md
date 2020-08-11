# Wachalarm IP-Web
![Titelbild Wachalarm IP-Web](https://user-images.githubusercontent.com/19272095/54090568-cbbe6d00-4375-11e9-937e-ae2a6cd9ea7a.jpg)

Wachalarm IP-Web ist ein Dienst, der auf jedem internetfähigem Endgerät - egal ob Windows, Linux, Mac oder Smartphone - Wachalarme anzeigen kann, ohne das zusätzliche Software zu installieren ist. Da es sich dabei um eine reine Web-Server-Anwendung handelt, sollte der Dienst am besten durch eine Leitstelle betrieben werden um die Einsatzalarme direkt an das System zu übergeben. Der Zugriff erfolgt innerhalb eines geschützten Netzwerkes (VPN, LAN etc.) oder direkt über das Internet (sofern freigegeben und gewollt).\
Der Web-Server empfängt Einsatzdaten über eine definierte Schnittstelle aus dem Einsatzleitsystem (oder auch von anderen Systemen) und übersendet diese dann an die jeweiligen verbunden Clients.

Mithilfe der eingebauten Rückmeldefunktion können Einsatzkräfte mitteilen ob Sie an einem Einsatz teilnehmen. Dabei wird die fachliche Qualifikation und wahrscheinliche Eintreffzeit übermittelt. Persönliche Daten (wie Name, Vorname etc.) werden nicht verarbeitet.

Die Anwendung ist Open-Source und kann - unter Berücksichtung der [Lizenz](https://github.com/Robert-112/Wachalarm-IP-Web/blob/master/LICENSE.md) - von jedem frei verwendet werden. Außerdem ist jeder dazu eingeladen an der Weiterentwicklung dieses Repositories mitzuhelfen.

**Weitere Informationen zur Benutzung und Funktionsweise finden Sie im [Wiki](https://github.com/Robert-112/Wachalarm-IP-Web/wiki)**

# DEMO

Die Demo-Version zeigt frei erfundene Einsätze an, die jede Stunde neu alarmiert werden.

[📺🔥 https://wachalarm.mooo.com/](https://wachalarm.mooo.com/)

Login-Daten:
- Benutzer: me
- Passwort: 123

# Funktionsumfang (Auszug)
* Anzeige verschiedener Wachalarme für einzelne Wachen, Träger oder ganze Kreise
* Ausgabe synthetischer Sprachdurchsagen (Gong, Einsatzart, Stichwort, Ort, Ortsteile, beteiligte Einsatzmittel, Sondersignal)
* Kartenmodul zur Anzeige des Einsatzortes
* Responsive Webdesign - gleiche Anzeige des Wachalarms auf allen Geräten, Unterstützung von Hoch- und Querformat
* Rechteverwaltung von Benutzern zur Sicht von Wachalarmen verschiedenster Wachen, Träger oder ganzer Kreise
* Verschlüsselte Übertragung der Einsatzdaten über https und Websocket
* Anzeige von reduzierten Alarmen bei fehlender Berechtigung  (Datenschutzoption) 
* Steuerung der übermittelten Daten durch den Server - auf dem Client werden keine Daten gespeichert (außer dem Session-Cookie)
* Volle kompatibilität mit den gängigen Browsern (getestet in Chrome, Firefox, Safari, Microsoft Edge)
* Rückmeldefunktion (für Feuerwehren, gesteuert über externe Gruppenverwaltung)
* Dashboard zur Einzeige des Gesamteinsatzes, inkl. aller Alarmierten Einsatzmittel und aller Einsatzrückmeldungen
* verschiedene Schnittstellen zur Übermittlung von Einsatzalarmen sowie zum Austausch und zur Verteilung von Rückmeldungen
* Basierend auf modernsten Web-Technologien ([Node.js](https://nodejs.org/), [Express](https://expressjs.com/de/), [Socket.io](https://socket.io/), [Passport](http://www.passportjs.org/), [SQLite](https://www.sqlite.org/), [Bootstrap](https://getbootstrap.com/), [Leaflet](https://leafletjs.com/))


# Screenshots (Version 1.2)
## Startseite

![image](https://user-images.githubusercontent.com/19272095/89553393-bcaf4900-d80d-11ea-845e-18b80ae58865.png)

## Alarmmonitor

### Darstellung im Querformat

> angemeldeter Benutzer mit vollen Rechten auf den Alarmmonitor der Wache 1

![image](https://user-images.githubusercontent.com/19272095/89553449-d355a000-d80d-11ea-9841-46e856eae81f.png)

### Darstellung im Hochformat

>  Benutzer ist nicht angemeldet, sieht reduzierten Inhalt der Wache 2

![image](https://user-images.githubusercontent.com/19272095/89553608-0730c580-d80e-11ea-8aea-5197ef7dcc9b.png)

### Bildschirmschoner

> wird angezeigt wenn kein Einsatz für die Wache vorhanden ist

![image](https://user-images.githubusercontent.com/19272095/89553283-98ec0300-d80d-11ea-9675-8dbf895931b6.png)

## Dashboard

### Übersicht

> Auflistung der im System hinterlegten laufenden Einsätze

![image](https://user-images.githubusercontent.com/19272095/89554016-93db8380-d80e-11ea-9b43-62c127a386fb.png)

### Einsatz im Dashboard

> vollständiger Einsatz inkl. aller Wachen und aller Einsatzrückmeldungen; Benutzer ist angemeldet und hat das Recht zur Einsicht aller Daten der Wache

![image](https://user-images.githubusercontent.com/19272095/89554140-bc637d80-d80e-11ea-8fe9-2956d13b4972.png)

## Rückmeldung

> Darstellung auf einem Smartphone;\
benötigt externen Verteilerdienst wie z.B. Twitter

![image](https://user-images.githubusercontent.com/19272095/89553052-50cce080-d80d-11ea-8922-38948ea2a989.png)
![image](https://user-images.githubusercontent.com/19272095/89553092-5e826600-d80d-11ea-9aa6-2b354b9049bd.png)

## Login

![FireShot Capture 003 - Login - localhost](https://user-images.githubusercontent.com/19272095/54091418-0c22e880-4380-11e9-8657-5011db2435df.png)

## Benutzerverwaltung

![FireShot Capture 004 - Benutzer und Rechte verwalten - localhost](https://user-images.githubusercontent.com/19272095/54091419-0c22e880-4380-11e9-8677-b7f9db1a422d.png)

# Lizenz
#### [\[Creative Commons Attribution Share Alike 4.0 International\]](https://github.com/Robert-112/Wachalarm-IP-Web/blob/master/LICENSE.md)
