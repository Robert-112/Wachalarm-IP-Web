module.exports = function (io, sql, fs, brk, async, app_cfg, api, proof) {

  // Module laden
  const json2csv = require('json2csv'); 

  function einsatz_speichern(einsatz_rohdaten, app_id) {
    // Einsatzmeldung in Datenbank speichern und verteilen
    proof.validate_waip(einsatz_rohdaten, function (valid) {
      if (valid) {

        // Einsatzmeldung (JSON) speichern
        sql.db_einsatz_speichern(einsatz_rohdaten, function (waip_id) {
          sql.db_log('WAIP', 'DEBUG: Neuer Einsatz mit der ID ' + waip_id);
          // nach dem Speichern anhand der waip_id die beteiligten Wachennummern zum Einsatz ermitteln 
          sql.db_einsatz_get_rooms(waip_id, function (socket_rooms) {
            if (socket_rooms) {
              socket_rooms.forEach(function (rooms) {
                // fuer jede Wache(rooms.room) die verbundenen Sockets(Clients) ermitteln und den Einsatz verteilen
                var room_sockets = io.nsps['/waip'].adapter.rooms[rooms.room];
                if (typeof room_sockets !== 'undefined') {
                  Object.keys(room_sockets.sockets).forEach(function (socket_id) {
                    var socket = io.of('/waip').connected[socket_id];
                    waip_verteilen(waip_id, socket, rooms.room);
                    sql.db_log('WAIP', 'Einsatz ' + waip_id + ' wird an ' + socket.id + ' (' + rooms.room + ') gesendet');
                  });
                };
              });
            } else {
              sql.db_log('Fehler-WAIP', 'Fehler: Keine Wache für den Einsatz mit der ID ' + waip_id + ' vorhanden! Einsatz wird gelöscht!');
              sql.db_einsatz_loeschen(waip_id);
            };
          });
          // pruefen ob für die beteiligten Wachen eine Verteiler-Liste hinterlegt ist, falls ja, Rueckmeldungs-Link senden
          sql.db_vmtl_get_list(waip_id, function (list) {
            if (list) {
              brk.alert_vmtl_list(list, function (result) {
                if (!result) {
                  sql.db_log('VMTL', 'Link zur Einsatz-Rückmeldung erfolgreichen an Vermittler-Liste gesendet. ' + result);
                } else {
                  sql.db_log('VMTL', 'Fehler beim senden des Links zur Einsatz-Rueckmeldung an die Vermittler-Liste: ' + result);
                };
              });
            } else {
              sql.db_log('VMTL', 'Keine Vermittler-Liste für Wachen im Einsatz ' + waip_id + ' hinterlegt. Rückmeldung wird nicht verteilt.');
            };
          });
        });
        // Einsatzdaten per API weiterleiten (entweder zum Server oder zum verbunden Client)
        api.server_to_client_new_waip(einsatz_rohdaten, app_id);
        api.client_to_server_new_waip(einsatz_rohdaten, app_id);
      };
    });
  };


  function waip_verteilen(waip_id, socket, wachen_nr) {
    // Einsatzdaten für eine Wache aus Datenbank laden und an Client verteilen
    var user_obj = socket.request.user;
    sql.db_einsatz_get_by_waipid(waip_id, wachen_nr, user_obj.id, function (einsatzdaten) {
      if (einsatzdaten) {
        // Berechtigung ueberpruefen
        sql.db_user_check_permission(user_obj, waip_id, function (valid) {
          // Wenn nutzer nicht angemeldet, Daten entfernen
          if (!valid) {
            einsatzdaten.objekt = '';
            einsatzdaten.besonderheiten = '';
            einsatzdaten.strasse = '';
            einsatzdaten.wgs84_x = '';
            einsatzdaten.wgs84_y = '';
          };         
          // pruefen ob Einsatz bereits genau so beim Client angezeigt wurde (Doppelalarmierung)
          sql.db_einsatz_check_history(waip_id, einsatzdaten, socket_id, function (result) {
            if (!result) {
              // Einsatz an Client senden
              socket.emit('io.new_waip', einsatzdaten);
              sql.db_log('WAIP', 'Einsatz ' + waip_id + ' fuer Wache ' + wachen_nr + ' an Socket ' + socket.id + ' gesendet.');
              sql.db_client_update_status(socket, waip_id);
              // Sound erstellen
              tts_erstellen(app_cfg, socket.id, einsatzdaten, function (tts) {
                if (tts) {
                  // Sound senden
                  socket.emit('io.playtts', tts);
                  sql.db_log('WAIP', 'ttsfile: ' + tts);
                };
              });
            } else {
              // Log das Einsatz explizit nicht an Client gesendet wurde
              sql.db_log('WAIP', 'Einsatz ' + waip_id + ' fuer Wache ' + wachen_nr + ' nicht an Socket ' + socket.id + ' gesendet, da bereits angezeigt (Doppelalarmierung).');
            };
          });          
        });
      } else {
        // Standby senden
        socket.emit('io.standby', null);
        sql.db_log('WAIP', 'Kein Einsatz fuer Wache ' + wachen_nr + ' vorhanden, Standby an Socket ' + socket.id + ' gesendet.');
        sql.db_client_update_status(socket, null);
      };
    });
  };

  function rmld_speichern(rueckmeldung, host, app_id, callback) {
    // Rueckmeldung speichern und verteilen
    proof.validate_rmld(req.body, function (valid) {
      if (valid) {
        if (!host == null) {
          host = ' von ' + host;
        };
        sql.db_rmld_save(rueckmeldung, function (result) {
          if (result) {
            waip.rmld_verteilen_by_uuid(rueckmeldung.waip_uuid, rueckmeldung.rmld_uuid);
            sql.db_log('RMLD', 'Rückmeldung' + host + ' erhalten und gespeichert: ' + result);
            callback && callback(result);
          } else {
            sql.db_log('RMLD', 'Fehler beim speichern der Rückmeldung' + host + ': ' + rueckmeldung);
            callback && callback(result);
          };
        });
        api.server_to_client_new_rmld(rueckmeldung, app_id);
        api.client_to_server_new_rmld(rueckmeldung, app_id);
      };
    });
  };

  function rmld_verteilen_by_uuid(waip_uuid, rmld_uuid) {
    // Einsatz-ID mittels Einsatz-UUID ermitteln
    sql.db_einsatz_get_waipid_by_uuid(waip_uuid, function (waip_id) {
      // am Einsatz beteilite Socket-Räume ermitteln
      sql.db_einsatz_get_rooms(waip_id, function (socket_rooms) {
        if (socket_rooms) {
          socket_rooms.forEach(function (row) {
            // fuer jede Wache(row.room) die verbundenen Sockets(Clients) ermitteln und Standby senden
            var room_sockets = io.nsps['/waip'].adapter.rooms[row.room];
            if (typeof room_sockets !== 'undefined') {
              Object.keys(room_sockets.sockets).forEach(function (socket_id) {
                // wenn Raum zum Einsatz aufgerufen ist, dann Rueckmeldung aus DB laden und an diesen versenden
                sql.db_rmld_get_by_rmlduuid(rmld_uuid, function (rmld_obj) {
                  if (rmld_obj) {
                    // Rückmeldung an Clients/Räume senden, wenn richtiger Einsatz angezeigt wird
                    sql.db_client_check_waip_id(socket_id, waip_id, function (same_id) {
                      if (same_id) {
                        var socket = io.of('/waip').connected[socket_id];
                        socket.emit('io.new_rmld', rmld_obj);
                        sql.db_log('RMLD', 'Rückmeldung ' + rmld_uuid + ' für den Einsatz mit der ID ' + waip_id + ' an Wache ' + row.room + ' gesendet.');
                        sql.db_log('DEBUG', 'Rückmeldung JSON: ' + JSON.stringify(rmld_obj));
                      };
                    });


                    /*socket_rooms.forEach(function (rooms) {
                      io.of('/waip').to(rooms.room).emit('io.new_rmld', rmld_obj);
                      sql.db_log('RMLD', 'Rückmeldung ' + rmld_uuid + ' für den Einsatz mit der ID ' + waip_id + ' an Wache ' + rooms.room + ' gesendet.');
                      sql.db_log('DEBUG', 'Rückmeldung JSON: ' + JSON.stringify(rmld_obj));
                    });*/
                  };
                });




              });
            };
          });
        };
      });









    });
  };

  function rmld_verteilen_for_one_client(waip_id, socket, wachen_id) {
    if (typeof socket !== 'undefined') {
      sql.db_rmld_get_fuer_wache(waip_id, wachen_id, function (rmld_obj) {
        if (rmld_obj) {
          // Rueckmeldung nur an den einen Socket senden
          socket.emit('io.new_rmld', rmld_obj);
          sql.db_log('RMLD', 'Vorhandene Rückmeldungen an Socket ' + socket.id + ' gesendet.');
          sql.db_log('DEBUG', 'Rückmeldung JSON: ' + JSON.stringify(rmld_obj));
        } else {
          sql.db_log('RMLD', 'Keine Rückmeldungen für Einsatz-ID' + waip_id + ' und Wachen-ID ' + wachen_id + ' vorhanden.');
        };
      });
    };
  };


  function dbrd_verteilen(dbrd_uuid, socket) {
    sql.db_einsatz_get_by_uuid(dbrd_uuid, function (einsatzdaten) {
      if (einsatzdaten) {
        sql.db_user_check_permission(socket.request.user, einsatzdaten.id, function (valid) {
          if (!valid) {
            delete einsatzdaten.objekt;
            delete einsatzdaten.besonderheiten;
            delete einsatzdaten.strasse;
            delete einsatzdaten.wgs84_x;
            delete einsatzdaten.wgs84_y;
          };
          socket.emit('io.Einsatz', einsatzdaten);
          sql.db_log('DBRD', 'Einsatzdaten für Dashboard ' + dbrd_uuid + ' an Socket ' + socket.id + ' gesendet');
          sql.db_client_update_status(socket, dbrd_uuid);
        });
      } else {
        // Standby senden
        socket.emit('io.standby', null);
        sql.db_log('DBRD', 'Der angefragte Einsatz ' + dbrd_uuid + ' ist nicht - oder nicht mehr - vorhanden!, Standby an Socket ' + socket.id + ' gesendet.');
        sql.db_client_update_status(socket, null);
      };
    });
  };

  // TODO WAIP: Funktion um Clients remote "neuzustarten" (Seite neu laden), niedrige Prioritaet

  function tts_erstellen(app_cfg, socket_id, einsatzdaten, callback) {
    // unnoetige Zeichen aus socket_id entfernen, um diese als Dateinamen zu verwenden
    var id = socket_id.replace(/\W/g, '');
    // Pfade der Sound-Dateien defeinieren
    var wav_tts = process.cwd() + app_cfg.global.soundpath + id + '.wav';
    var mp3_tmp = process.cwd() + app_cfg.global.soundpath + id + '_tmp.mp3';
    var mp3_tts = process.cwd() + app_cfg.global.soundpath + id + '.mp3';
    var mp3_url = app_cfg.global.mediapath + id + '.mp3';
    // unterscheiden des Alarmgongs nach Einsatzart
    if (einsatzdaten.einsatzart == "Brandeinsatz" || einsatzdaten.einsatzart == "Hilfeleistungseinsatz") {
      var mp3_bell = process.cwd() + app_cfg.global.soundpath + 'bell_long.mp3';
    } else {
      var mp3_bell = process.cwd() + app_cfg.global.soundpath + 'bell_short.mp3';
    };
    // Zusammensetzen der Sprachansage
    async.map(JSON.parse(einsatzdaten.em_alarmiert), sql.db_tts_einsatzmittel, function (err, einsatzmittel) {
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
        // Windows
        case 'win32':
          // Powershell
          var proc = require('child_process');
          var commands = [
            // TTS-Schnittstelle von Windows ansprechen
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
          childD.stderr.on('data', function (data) {
            sql.db_log('Fehler-TTS', data);
            callback && callback(null);
          });
          childD.on('exit', function () {
            callback && callback(mp3_url);
          });
          childD.stdin.end();
          break;
          // LINUX
        case 'linux':
          // bash
          var proc = require('child_process');
          var commands = [
            // TTS-Schnittstelle SVOX PicoTTS
            '-c', `
            pico2wave --lang=de-DE --wave=` + wav_tts + ` \"` + tts_text + `\"
            ffmpeg -nostats -hide_banner -loglevel 0 -y -i ` + wav_tts + ` -vn -ar 44100 -ac 2 -ab 128k -f mp3 ` + mp3_tmp + `
            ffmpeg -nostats -hide_banner -loglevel 0 -y -i \"concat:` + mp3_bell + `|` + mp3_tmp + `\" -acodec copy ` + mp3_tts + `
            rm ` + wav_tts + `
            rm ` + mp3_tmp
          ];
          var options = {
            shell: true
          };
          if (app_cfg.global.development) {
            console.log(commands);
          };
          var childD = proc.spawn('/bin/sh', commands);
          childD.stdin.setEncoding('ascii');
          childD.stderr.setEncoding('ascii');
          childD.on('exit', function (code, signal) {
            if (code > 0) {
              sql.db_log('Fehler-TTS', 'Exit-Code ' + code + '; Fehler beim erstellen der TTS-Datei');
              callback && callback(null);
            } else {
              callback && callback(mp3_url);
            };
          });
          childD.stdin.end();
          break;
          // anderes OS
        default:
          sql.db_log('Fehler-TTS', 'TTS für dieses Server-Betriebssystem nicht verfügbar!');
          callback && callback(null);
      };
    });
  };

  setInterval(function () {

    // Aufräumen (alle 10 Sekunden)
    sql.db_socket_get_all_to_standby(function (socket_ids) {
      // alle User-Einstellungen prüfen und ggf. Standby senden
      if (socket_ids) {
        socket_ids.forEach(function (row) {
          var socket = io.of('/waip').connected[row.socket_id];
          socket.emit('io.standby', null);
          socket.emit('io.stopaudio', null);
          sql.db_log('WAIP', 'Standby an Socket ' + socket.id + ' gesendet');
          sql.db_client_update_status(socket, null);
        });
      };
    });

    sql.db_einsatz_get_old(app_cfg.global.time_to_delete_waip, function (waip) {
      // nach alten Einsaetzen suchen und diese ggf. loeschen
      if (waip) {
        sql.db_log('WAIP', 'Einsatz mit der ID ' + waip.id + ' ist veraltet und kann gelöscht werden.')
        // beteiligte Wachen zum Einsatz ermitteln
        sql.db_einsatz_get_rooms(waip.id, function (data) {
          if (data) {
            data.forEach(function (row) {
              // fuer jede Wache (row.room) die verbundenen Sockets(Clients) ermitteln und Standby senden
              var room_sockets = io.nsps['/waip'].adapter.rooms[row.room];
              if (typeof room_sockets !== 'undefined') {
                Object.keys(room_sockets.sockets).forEach(function (socket_id) {
                  // Standby senden    
                  var socket = io.of('/waip').connected[socket_id];
                  sql.db_client_check_waip_id(socket.id, waip.id, function (same_id) {
                    if (same_id) {
                      socket.emit('io.standby', null);
                      socket.emit('io.stopaudio', null);
                      sql.db_log('WAIP', 'Standby an Socket ' + socket.id + ' gesendet');
                      sql.db_client_update_status(socket, null);
                    };
                  });
                });
              };
            });
          };
        });
        sql.db_socket_get_by_room(waip.uuid, function (socket_ids) {
          // Dashboards trennen, deren Einsatz geloescht wurde
          // TODO TEST: Dashboard-Trennen-Funktion testen
          if (socket_ids) {
            socket_ids.forEach(function (row) {
              var socket = io.of('/dbrd').connected[row.socket_id];
              socket.emit('io.deleted', null);
              sql.db_log('DBRD', 'Dashboard mit dem  Socket ' + socket.id + ' getrennt, da Einsatz gelöscht.');
              sql.db_client_update_status(socket, null);
            });
          };
        });
        // FIXME: Rueckmeldung löschen, und vorher ggf. per Mail versenden  bzw. Backup speichern
        sql.db_rmld_get_by_waipuuid(waip.uuid, function (full_rmld) {
          // originale Einsatznummer hinzufuegen, fuer spaetere Recherche
          // FIXME siehe sql
					full_rmld.einsatznummer = waip.einsatznummer
					
					map wachennummer in jspn, add 0
					
					jetzt exportliste nach passendem mit filter suchen, dabei distinct wachennr übergeben
					   db.each
						   jetzt csv erzeugen und versenden
					falls kein filter
					   wenn bkp altiviert, gesamt-csv speichern
					
					
          // CSV-Spalten definieren
          var csv_col = ['id', 'einsatznummer', 'waip_uuid', 'rmld_uuid', 'alias', 'einsatzkraft', 'maschinist', 'fuehrungskraft', 'agt' ,'set_time' ,'arrival_time' ,'wache_id' ,'wache_nr' ,'wache_name'];
          // gesamte CSV erstellen, falls aktiviert
          
          
          CREATE TABLE waip_export (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            export_name TEXT,
            export_text TEXT,
            export_filter TEXT,
            export_recipient TEXT)`);
          
          
          json2csv({data: full_rmld, fields: csv_col}, function(err, csv) {
            if (err) console.log(err);
            // CSV in Backup-Ordner speichern, falls aktiviert
            fs.writeFile('cars.csv', csv, function(err) {
              if (err) throw err;
              console.log('cars file saved');
            });
            
          });
          // teil-CSV fuer einzelne Wache erstellen

          
          // CSV per Mail versenden, falls aktiviert
              // einzelne Wachen 
            // später löschen, wenn app_cfg.global.backup_rmld false
          // Mail-Adressen fuer Wachen zu dieser Einsatz-ID ermitteln, siehe db_vmtl_get_list
          // csv an diese Mail-Adressen per Mail senden
            // wenn app_cfg.global.mail_rmld is true
            db_rmld_loeschen(waip_uuid) 
        });
        // Einsatz löschen
        sql.db_einsatz_loeschen(waip.id);
        sql.db_log('WAIP', 'Einsatz-Daten zu Einsatz ' + waip.id + ' gelöscht.');
      };
    });

    // löschen alter Sounddaten nach alter (15min) und socket-id (nicht mehr verbunden)
    fs.readdirSync(process.cwd() + app_cfg.global.soundpath).forEach(file => {
      // nur die mp3s von alten clients loeschen
      if (file.substring(0, 4) != 'bell' && file.substring(file.length - 3) == 'mp3' && file.substring(file.length - 8) != '_tmp.mp3') {
        sql.db_socket_get_by_id(file.substring(0, file.length - 4), function (data) {
          if (!data) {
            fs.unlink(process.cwd() + app_cfg.global.soundpath + file, function (err) {
              if (err) return sql.db_log('Fehler-WAIP', err);
              sql.db_log('WAIP', file + ' wurde erfolgreich geloescht');
            });
          };
        });
      };
    })
  }, 10000);


  return {
    einsatz_speichern: einsatz_speichern,
    waip_verteilen: waip_verteilen,
    rmld_speichern: rmld_speichern,
    dbrd_verteilen: dbrd_verteilen,
    rmld_verteilen_for_one_client: rmld_verteilen_for_one_client,
    rmld_verteilen_by_uuid: rmld_verteilen_by_uuid
  };
};