module.exports = function(io, sql, async, app_cfg) {

  // Socket.IO
  io.on('connection', function(socket) {
    sql.db_log('WAIP', 'Anwendung von ' + socket.request.connection.remoteAddress + ' (' + socket.id + ') geoeffnet');
    io.sockets.to(socket.id).emit('io.version', app_cfg.global.app_id);
    // disconnect
    socket.on('disconnect', function() {
      sql.db_log('WAIP', 'Alarmmonitor von ' + socket.request.connection.remoteAddress + ' (' + socket.id + ') geschlossen');
      sql.db_client_delete(socket.id);
    });
    // Aufruf des Alarmmonitors einer bestimmten Wache verarbeiten
    socket.on('wachen_id', function(wachen_id) {
      sql.db_log('WAIP', 'Alarmmonitor Nr. ' + wachen_id + ' von ' + socket.request.connection.remoteAddress + ' (' + socket.id + ') aufgerufen');
      // prüfen ob Wachenummer in der Datenbank hinterlegt ist
      sql.db_wache_vorhanden(wachen_id,function(result) {
        // wenn die Wachennummer vorhanden/plausibel dann weiter
        if (result) {
          // Socket-Room beitreiten
          socket.join(wachen_id, function() {
            // Socket-ID und Client-IP in der Datenbank speichern
            sql.db_client_save(socket.id, socket.request.connection.remoteAddress, wachen_id);
            // prüfen ob für diese Wache ein Einsatz vorhanden ist
            sql.db_einsatz_vorhanden(wachen_id, socket.request.user.id, function(result_einsatz) {
              if (result_einsatz) {
                sql.db_log('WAIP', 'Einsatz ' + result_einsatz[0].waip_einsaetze_ID + ' fuer Wache ' + wachen_id + ' vorhanden');
                //letzten Einsatz verteilen
                einsatz_verteilen(result_einsatz[0].waip_einsaetze_ID, socket.id, wachen_id);
                sql.db_update_client_status(socket, result_einsatz[0].waip_einsaetze_ID);
              } else {
                sql.db_log('WAIP', 'Kein Einsatz fuer Wache ' + wachen_id + ' vorhanden, Standby');
                //oder falls kein Einsatz vorhanden ist, dann
                io.sockets.to(socket.id).emit('io.standby', null);
                sql.db_update_client_status(socket, null);
              };
            });
          });
        } else {
          sql.db_log('Fehler-WAIP', 'Fehler: Wachnnummer ' + wachen_id + 'nicht vorhanden');
          io.sockets.to(socket.id).emit('io.error', 'Fehler: Wachnnummer \'' + wachen_id + '\' nicht vorhanden!');
        };
      });
    });
    // TODO: socket.on(Version) um Server-Version abzugleichen
  });

  // Einsatzmeldung in Datenbank speichern
  function einsatz_speichern(message) {
    // Einsatzmeldung (JSON) speichern
    sql.db_einsatz_speichern(JSON.parse(message), function(waip_id) {
      // nach dem Speichern anhand der waip_id die beteiligten Wachennummern zum Einsatz ermitteln
      sql.db_log('WAIP', 'DEBUG: ' + waip_id);
      sql.db_get_einsatzwachen(waip_id, function(data) {
        if (data) {
          data.forEach(function(row) {
            // fuer jede Wache(row.room) die verbundenen Sockets(Clients) ermitteln und Einsatz verteilen
            var room_stockets = io.sockets.adapter.rooms[row.room];
            if (typeof room_stockets !== 'undefined') {
              Object.keys(room_stockets.sockets).forEach(function(socketId) {
                einsatz_verteilen(waip_id, socketId, row.room);
                sql.db_log('WAIP', 'Einsatz ' + waip_id + ' wird an ' + socketId + ' (' + row.room + ') gesendet');
              });
            };
          });
        } else {
          sql.db_log('Fehler-WAIP', 'Fehler: Wache für waip_id ' + waip_id + ' nicht vorhanden!');
        };
      });
    });
  };

  // Einsatz an Client verteilen
  function einsatz_verteilen(waip_id, socket_id, wachen_nr) {
    // Einsatzdaten für eine Wache aus Datenbank laden
    sql.db_get_einsatzdaten(waip_id, wachen_nr, function(einsatzdaten) {
      if (einsatzdaten) {
        // Berechtigung ueberpruefen
        var permissions = io.sockets.sockets[socket_id].request.user.permissions;
        sql.db_check_permission(permissions, waip_id, function(valid) {
          //console.log(permissions + ' ' + wachen_nr);
          //if (permissions == wachen_nr || permissions == 'admin') {} else {
          if (!valid) {
            einsatzdaten.besonderheiten = '';
            einsatzdaten.strasse = '';
            einsatzdaten.wgs84_x = einsatzdaten.wgs84_x.substring(0, einsatzdaten.wgs84_x.indexOf('.') + 3);
  			    einsatzdaten.wgs84_y = einsatzdaten.wgs84_y.substring(0, einsatzdaten.wgs84_y.indexOf('.') + 3);
          };
          // Einsatz senden
          io.sockets.to(socket_id).emit('io.neuerEinsatz', einsatzdaten)
          sql.db_log('WAIP', 'Einsatz ' + waip_id + ' fuer Wache ' + wachen_nr + ' an Socket ' + socket_id + ' gesendet');
          sql.db_update_client_status(io.sockets.sockets[socket_id], waip_id);
          // Sound erstellen
          tts_erstellen(app_cfg, socket_id, einsatzdaten, function(tts) {
            // Sound senden
            sql.db_log('WAIP', 'ttsfile: ' + tts);
            io.sockets.to(socket_id).emit('io.playtts', tts);
          });
        });
      } else {
        // Standby senden
        io.sockets.to(socket_id).emit('io.standby', null);
        sql.db_log('WAIP', 'Kein Einsatz fuer Wache ' + wachen_nr + ' vorhanden, Standby an Socket ' + socket_id + ' gesendet..');
        sql.db_update_client_status(io.sockets.sockets[socket_id], null);
      };
    });
  };

  function tts_erstellen(app_cfg, socket_id, einsatzdaten, callback) {
    // unnoetige Zeichen aus socket_id entfernen
    var id = socket_id.replace(/\W/g, '');
    // Pfade der Sound-Dateien defeinieren
    var wav_tts = process.cwd() + app_cfg.global.soundpath + id + '.wav';
    var mp3_tmp = process.cwd() + app_cfg.global.soundpath + id + '_tmp.mp3';
    var mp3_tts = process.cwd() + app_cfg.global.soundpath + id + '.mp3';
    var mp3_url = app_cfg.global.mediapath + id + '.mp3';
    // Unterscheiden des Alarmgongs nach Einsatzart
    if (einsatzdaten.einsatzart == "Brandeinsatz" || einsatzdaten.einsatzart == "Hilfeleistungseinsatz") {
      var mp3_bell = process.cwd() + app_cfg.global.soundpath + 'bell_long.mp3';
    } else {
      var mp3_bell = process.cwd() + app_cfg.global.soundpath + 'bell_short.mp3';
    };
    // Zusammensetzen der Sprachansage
    async.map(JSON.parse(einsatzdaten.em_alarmiert), sql.db_tts_einsatzmittel, function(err, einsatzmittel) {
      // Grunddaten
      var tts_text = einsatzdaten.einsatzart + ', ' + einsatzdaten.stichwort;
      if (einsatzdaten.objekt) {
        var tts_text = tts_text + '. ' + einsatzdaten.objekt + ', ' + einsatzdaten.ort + ', ' + einsatzdaten.ortsteil;
      } else {
        var tts_text = tts_text + '. ' + einsatzdaten.ort + ', ' + einsatzdaten.ortsteil;
      };
      // Einsatzmittel
      tts_text = tts_text + '. Für ' + einsatzmittel.join(", ");
      // Unterscheidung nach Sondersignal
      if (einsatzdaten.sondersignal == 1) {
        tts_text = tts_text + ', mit Sondersignal';
      } else {
        tts_text = tts_text + ', ohne Sonderrechte';
      };
      // Abschluss
      tts_text = tts_text + '. Ende der Durchsage!';
      // Sprachansage als mp3 erstellen
      switch (process.platform) {
      //if (process.platform === "win32") {
        case 'win32':
          // Powershell
          var proc = require('child_process');
          var commands = [
            // TTS-Schnittstelle von Windows
            'Add-Type -AssemblyName System.speech;' +
            '$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;' +
            // Ausgabedatei und Sprachtext
            '$speak.SetOutputToWaveFile(\"' + wav_tts + '\");' +
            '$speak.Speak(\"' + tts_text + '\");' +
            '$speak.Dispose();' +
            // speak.wav in mp3 umwandeln
            'ffmpeg -nostats -hide_banner -loglevel 0 -y -i ' + wav_tts + ' -vn -ar 44100 -ac 2 -ab 128k -f mp3 ' + mp3_tmp + ';' +
            // Gong und Ansage zu einer mp3 zusammensetzen
            'ffmpeg -nostats -hide_banner -loglevel 0 -y -i \"concat:' + mp3_bell + '|' + mp3_tmp + '\" -acodec copy ' + mp3_tts + ';' +
            'rm ' + wav_tts + ';' +
            'rm ' + mp3_tmp + ';'
          ];
          var options = {
            shell: true
          };
          var childD = proc.spawn('powershell', commands);
          childD.stdin.setEncoding('ascii');
          childD.stderr.setEncoding('ascii');
          childD.stderr.on('data', function(data) {
            sql.db_log('Fehler-TTS', data);
            callback && callback(null);
          });
          childD.on('exit', function() {
            callback && callback(mp3_url);
          });
          childD.stdin.end();
          break;
        case 'linux':
          // bash
          var proc = require('child_process');
          var commands = [
            // TTS-Schnittstelle SVOX PicoTTS
            '-c',  `
            pico2wave --lang=de-DE --wave=` + wav_tts + ` \"` + tts_text + `\"
            ffmpeg -nostats -hide_banner -loglevel 0 -y -i ` + wav_tts + ` -vn -ar 44100 -ac 2 -ab 128k -f mp3 ` + mp3_tmp + `
            ffmpeg -nostats -hide_banner -loglevel 0 -y -i \"concat:` + mp3_bell + `|` + mp3_tmp + `\" -acodec copy ` + mp3_tts + `
            rm ` + wav_tts + `
            rm ` + mp3_tmp
          ];
          var options = {
            shell: true
          };
          console.log(commands);
          var childD = proc.spawn('/bin/sh', commands);
          childD.stdin.setEncoding('ascii');
          childD.stderr.setEncoding('ascii');
          childD.stderr.on('data', function(data) {
            sql.db_log('Fehler-TTS', data);
            callback && callback(null);
          });
          childD.on('exit', function() {
            callback && callback(mp3_url);
          });
          childD.stdin.end();
          break;
    //  } else {
        default:
          sql.db_log('Fehler-TTS', 'TTS für dieses Server-Betriebssystem nicht verfügbar');
          callback && callback(null);
      };
    });
  };

  // Aufräumen (alle 10 Sekunden)
  setInterval(function() {
    // alle User-Einstellungen prüfen und ggf. Standby senden
    sql.db_get_sockets_to_standby(function(socket_ids){
      if (socket_ids) {
        socket_ids.forEach(function(row) {
          io.sockets.to(row.socket_id).emit('io.standby', null);
          io.sockets.to(row.socket_id).emit('io.stopaudio', null);
          sql.db_log('WAIP', 'Standby an Socket ' + row.socket_id + ' gesendet');
          sql.db_update_client_status(io.sockets.sockets[row.socket_id], null);
        });
      };
    });
    // Nach alten Einsaetzen suchen und diese ggf. loeschen
    sql.db_get_alte_einsaetze(app_cfg.global.time_to_delete_waip, function(waip_id) {
      if (waip_id) {
        sql.db_log('WAIP', 'Einsatz mit der ID ' + waip_id + ' ist veraltet und kann gelöscht werden.')
        //beteiligte Wachen ermitteln
        sql.db_get_einsatzwachen(waip_id, function(data) {
          if (data) {
            data.forEach(function(row) {
              // fuer jede Wache(row.room) die verbundenen Sockets(Clients) ermitteln und Standby senden
              var room_stockets = io.sockets.adapter.rooms[row.room];
              if (typeof room_stockets !== 'undefined') {
                Object.keys(room_stockets.sockets).forEach(function(socketId) {
                  // Standby senden
                  // TODO: Standby nur senden, wenn kein anderer (als der zu löschende) Einsatz angezeigt wird
                  sql.db_check_client_waipid(socketId, waip_id, function(same_id) {
                    if (same_id) {
                      io.sockets.to(socketId).emit('io.standby', null);
                      io.sockets.to(socketId).emit('io.stopaudio', null);
                      sql.db_log('WAIP', 'Standby an Socket ' + socketId + ' gesendet');
                      sql.db_update_client_status(io.sockets.sockets[socketId], null);
                    };
                  });
                });
              };
            });
          };
          // Einsatz löschen
          sql.db_log('WAIP', 'Einsatz ' + waip_id + ' wird gelöscht');
          sql.db_einsatz_loeschen(waip_id);
        });
      };
    });
    // TODO: löschen alter Sounddaten nach alter (15min) und socket-id (nicht mehr verbunden)
    // TODO: Löschen alter Einstze nach 24 h
    // alte mp3s loeschen
    const fs = require('fs');
    fs.readdirSync(process.cwd() + app_cfg.global.soundpath).forEach(file => {
      // nur die mp3s von alten clients loeschen
      if (file.substring(0, 4) != 'bell' && file.substring(file.length - 3) == 'mp3' && file.substring(file.length - 8) != '_tmp.mp3') {
        sql.db_get_socket_by_id(file.substring(0, file.length - 4), function(data) {
          if (!data) {
            fs.unlink(process.cwd() + app_cfg.global.soundpath + file, function(err) {
              if (err) return sql.db_log('Fehler-WAIP', err);
              sql.db_log('WAIP', file + ' wurde erfolgreich geloescht');
            });
          };
        });
      };
    })
  }, 10000);

  // TODO: Funktion um Clients "neuzustarten" (Seite remote neu laden)

  return {
    einsatz_speichern: einsatz_speichern
  };
};
