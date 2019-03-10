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
## Vorbereitungen
## Installation
(Platzhalter)
## Server-Einstellungen (app_cfg.js)
(Platzhalter)
## Zertifikat
Selbst signiertes Zertifikat:

    openssl req -nodes -new -x509 -keyout server.key -out server.cert

## Benutzer verwalten

# Schnittstelle
(Platzhalter)
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

## Erläuterung

# Screenshots

Folgen

# Lizenz

#### [\[Creative Commons Attribution Share Alike 4.0 International\]](https://github.com/Robert-112/Wachalarm-IP-Web/blob/master/LICENSE.md)
