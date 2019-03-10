# Wachalarm-IP-Web
![enter image description here](https://user-images.githubusercontent.com/19272095/54090568-cbbe6d00-4375-11e9-937e-ae2a6cd9ea7a.jpg)
In diesem Repository wird der Quellcode der Web-Version des **Wachalarm-IP** veröffentlicht. Die Anwendung wurde vollständig in [Node.js](https://nodejs.org/) geschrieben und kann unter Beachtung der Lizenzbedingungen kostenlos von jedem genutzt werden. 
Ziel dieser Version des Wachalarms soll es sein, auf jedem Endgerät - egal ob Windows, Linux, Mac, PC oder Smartphone - Alarme anzuzeigen ohne zusätzliche Software zu installieren. Da es sich beim Wachalarm-IP-Web um eine reine Web-Server-Anwendung handelt, sollte dieser am besten durch eine Leitstelle betrieben werden, die Einsatzalarme direkt an das System übergibt. Der Zugriff erfolgt dann innerhalb eines geschützten Netzwerkes (VPN, LAN etc.) oder direkt über das Internet (sofern freigegeben und gewollt).
Der Web-Server empfängt Einsatzdaten über eine definierte [Schnittstelle
](#schnittstelle) aus dem Einsatzleitsystem (oder anderen Systemen) und übersendet diese dann  an die jeweiligen Clients.
## Funktionsumfang
 - Anzeige verschiedener Wachalarme für einzelne Wachen, Träger oder ganze Kreise
 - Ausgabe synthetischer Sprachdurchsagen (Gong, Einsatzart, Stichwort, Ort, Ortsteile, beteiligte Einsatzmittel, Sondersignal)
 - Kartenmodul zur Anzeige des Einsatzortes
 - Responsive Webdesign - gleiche Anzeige des Wachalarms auf allen Geräten, Unterstützung von Hoch- und Querformat
 - Rechteverwaltung von Benutzern zur Sicht von Wachalarmen verschiedenster Wachen, Träger oder ganzer Kreise
 - Verschlüsselte Übertragung der Einsatzdaten (https)
 - Anzeige eines reduzierten (Datenschutz beachtenden) Wachalarms bei fehlender Berechtigung
 - Steuerung der übermittelten Daten durch den Server - auf dem Client werden keine Daten gespeichert (außer dem Session-Cookie)
 - Volle kompatibilität mit den gängigen Browsern (getestet in Chrome, Firefox, Safari, Microsoft Edge)
 - Basierend auf modernsten Web-Technologien ([Node.js](https://nodejs.org/), [Express](https://expressjs.com/de/), [Socket.io](https://socket.io/), [Passport](http://www.passportjs.org/), [SQLite](https://www.sqlite.org/), [Bootstrap](https://getbootstrap.com/), [Leaflet](https://leafletjs.com/))
# Installation & Konfiguration
## Vorbereitung & Installation
 - Installation von [Node.js](https://nodejs.org/) (Version 10 LTS oder höher)
 - Installation von [FFmpeg](https://www.ffmpeg.org/) (wird benötigt um Sound-Dateien umzuwandeln und neu zusammen zu setzen)
 - Download des Quellcodes ([Master](https://github.com/Robert-112/Wachalarm-IP-Web/archive/master.zip))
 - Entpacken der *.zip-Datei
 - Komandozeile öffnen (Powershell, CMD, Terminal etc.) und in das entpackte Verzeichnis wechseln. Dort folgende Befehle eingeben
	 6. `npm install` (lädt und installiert alle Pakete)
	 7. `npm start` (startet den Web-Server)
## Server-Einstellungen
In der  Unterverzeichnis Datei ./server/app_cfg.js können individuelle Einstellungen für den Betrieb des Servers gesetzt werden:
 - `http_port: 3000` (HTTP-Port der Anwendung)
 - `https_port: 3443` (HTTPS-Port der Anwendung)
 - `udpport: 60233` (UDP-Port der Schnittstelle)
 - `database: './database.sqlite3'` (Speicherort der Datenbank)
 - `soundpath: '/public/media/'` (Speicherort der Sound-Dateien)
 - `mediapath: '/media/'` (Pfad der Mediendateien)
 - `defaultuser: 'me'` (Standard-Administrator, beim ersten Start)
 - `defaultpass: '123'` (Standarad-Administrator-Passwort)
 - `defaultuserip: '127.0.0.1'` (Standard-IP des Administrators)
 - `ip_auth_range: ['::ffff:172.16.5.0/24', '::ffff:192.168.2.0/24']` (Bereich / Bereiche aus denen eine Anmeldung per IP-Adresse zulässig ist)
 - `saltRounds: 10` (Anzahl der Verschlüsselungsrunden für Kennwörter)
 - `sessionsecret: '0987654321abcdef#xyz'` (Geheimnis für Session-Speicherung)
 - `app_id: process.pid` (Prozess-ID)
 - `map_tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'` (Provider der Hintergrund-Karte des Wachalarms)
## Zertifikat
Erläuterung folgt.
Selbst signiertes Zertifikat erstellen:

    openssl req -nodes -new -x509 -keyout server.key -out server.cert

## Benutzer verwalten
Erläuterung folgt.
# Schnittstelle
Erläuterung folgt.
## Beispiel JSON
    {
      "einsatzdaten": {
        "nummer": "419123456",
        "alarmzeit": "19.02.16&17:16",
        "art": "Brandeinsatz",
        "stichwort": "B:Sonderobjekt",
        "sondersignal": 1,
        "besonderheiten": "Probeeinsatz für Wachalarm-IP-Web der Leitstelle Lausitz!",
        "patient": "Mustermann, Max"
      },
      "ortsdaten": {
        "ort": "Cottbus",
        "ortsteil": "Madlow",
        "strasse": "Dresdener-Straße 46",
        "objekt": "Regionalleitstelle Lausitz",
        "objektnr": "-1",
        "objektart": "",
        "wachfolge": "520201",
        "wgs84_x": "51.733266",
        "wgs84_y": "14.337831"
      },
      "alarmdaten": [
        {
          "typ": "ALARM",
          "netzadresse": "192.168.1.120",
          "wachenname": "CB FW Cottbus 1",
          "einsatzmittel": "FL CB 01/82-01",
          "zeit_a": "17:16",
          "zeit_b": "",
          "zeit_c": ""
        },
        {
          "typ": "ALARM",
          "netzadresse": "",
          "wachenname": "CB FW Cottbus 2",
          "einsatzmittel": "FL CB 02/46-01",
          "zeit_a": "17:16",
          "zeit_b": "",
          "zeit_c": ""
        }
      ]
    }
# Screenshots
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
