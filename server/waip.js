module.exports = function(io, sql, async, app_cfg) {

  // Einsatzmeldung in Datenbank speichern
  function einsatz_speichern(message) {
    // Einsatzmeldung (JSON) speichern
    sql.db_einsatz_speichern(JSON.parse(message), function(waip_id) {
      // nach dem Speichern anhand der waip_id die beteiligten Wachennummern zum Einsatz ermitteln
      sql.db_log('WAIP', 'DEBUG: ' + waip_id);
      sql.db_get_einsatzwachen(waip_id, function(data) {
        if (data) {
          console.log(data);
          data.forEach(function(row) {
            // fuer jede Wache(row.room) die verbundenen Sockets(Clients) ermitteln und Einsatz verteilen
            var room_sockets = io.sockets.adapter.rooms[row.room];
            //console.log(row);
            //console.log(row.room);
            //console.log(room_sockets);
            //console.log(io.sockets.adapter);
            if (typeof room_sockets !== 'undefined') {
              Object.keys(room_sockets.sockets).forEach(function(socketId) {
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
    sql.db_get_einsatzdaten(waip_id, wachen_nr, io.sockets.sockets[socket_id].request.user.id, function(einsatzdaten) {
      if (einsatzdaten) {
        // Berechtigung ueberpruefen
        var permissions = io.sockets.sockets[socket_id].request.user.permissions;
        sql.db_check_permission(permissions, waip_id, function(valid) {
          //console.log(permissions + ' ' + wachen_nr);
          //if (permissions == wachen_nr || permissions == 'admin') {} else {
          if (!valid) {
            einsatzdaten.objekt = '';
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
            if (tts) {				
			  // Sound senden
			  sql.db_log('WAIP', 'ttsfile: ' + tts);
			  io.sockets.to(socket_id).emit('io.playtts', tts);
			};
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

  function reuckmeldung_verteilen_by_uuid(waip_uuid, rmld_uuid) {
    
    sql.db_get_waipid_by_uuid(waip_uuid, function(waip_id) {
    
      console.log('rueckmeldung waip_id: '+waip_id);
      
      
      
      sql.db_get_einsatzwachen(waip_id, function(data) {
        console.log(data);
        if (data) {
        
     
          data.forEach(function(row) {
            console.log(row.room);
            
            
          sql.db_get_single_response_by_rmlduuid(rmld_uuid, function(rmld){
                   console.log('vorhandene reuckmeldungen fuer die wache: ' + rmld); 
                  if (rmld) {
                    //waip.reuckmeldung_senden(socket.id, rmld);
                    io.to(row.room).emit('io.response', 'a');
                  };
                }); 
			
           /* var room_stockets = io.sockets.adapter.rooms[socketid];
          if (typeof socketid !== 'undefined') {
            Object.keys(room_stockets.sockets).forEach(function(socket_id) {
              io.sockets.to(socketid).emit('io.response', rmld)
              sql.db_log('WAIP', 'Rückmeldung ' + rmld + ' an Socket ' + socket_id + ' gesendet');
            });
          };*/


            //sql.db_get_response_wache(waip_id, row.room, function(result){
              //console.log('response_wache: ' + result); 
              //if (row.room) {
                //reuckmeldung_verteilen(waip_id, result);
              //};
            //});  
          
          });
        } else {
          sql.db_log('Fehler-WAIP', 'Fehler: Wache für waip_id ' + waip_id + ' nicht vorhanden, Rückmeldung konnte nicht verteilt werden!');
        };
      });
    });
  };

  function reuckmeldung_senden(socketid, rmld) {
    //console.log('rueckmeldung alt: '+waip_id + ' ' + result);
    //sql.db_get_einsatzwachen(waip_id, function(data) {
     // if (data) {
        //data.forEach(function(row) {
          // fuer jede Wache(row.room) die verbundenen Sockets(Clients) ermitteln und Einsatz verteilen
          //var room_stockets = io.sockets.adapter.rooms[socketid];
          if (typeof socketid !== 'undefined') {
            //Object.keys(room_stockets.sockets).forEach(function(socket_id) {
              io.sockets.to(socketid).emit('io.response', rmld)
              sql.db_log('WAIP', 'Rückmeldung ' + rmld + ' an Socket ' + socketid + ' gesendet');
            //});
          };
        //});
      //} else {
        //sql.db_log('Fehler-WAIP', 'Fehler: Wache für waip_id ' + waip_id + ' nicht vorhanden, Rückmeldung konnte nicht verteilt werden!');
      //};
    //});
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
      // ungewollte zeichen aus Sprachansage entfernen
      tts_text = tts_text.replace(/:/g, " ");
      tts_text = tts_text.replace(/\//g, " ");
      tts_text = tts_text.replace(/-/g, " ");
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
          childD.on('exit', function(code, signal) {
			if (code > 0) {
			  sql.db_log('Fehler-TTS', 'Exit-Code '+ code +'; Fehler beim erstellen der TTS-Datei');
			  callback && callback(null);
			} else {
			  callback && callback(mp3_url);
			};
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
    einsatz_speichern: einsatz_speichern,
	einsatz_verteilen: einsatz_verteilen,
  reuckmeldung_senden: reuckmeldung_senden,
  reuckmeldung_verteilen_by_uuid: reuckmeldung_verteilen_by_uuid
  };
};
