module.exports = function (io, sql, fs, brk, async, app_cfg, proof) {

  // Module laden
  const json2csv = require('json2csv');
  const sendmail = require('sendmail')({
    silent: true
  });

  function waip_speichern(einsatz_rohdaten) {
    // Einsatzmeldung in Datenbank speichern und verteilen
    proof.validate_waip(einsatz_rohdaten, function (valid) {
      if (valid) {
        // Einsatzmeldung (JSON) speichern
        sql.db_einsatz_speichern(einsatz_rohdaten, function (waip_id) {
          sql.db_log('DEBUG', 'Neuen Einsatz mit der ID ' + waip_id + ' gespeichert.');

  // FIXME hier ungewollte Einsaetze ggf. wieder loeschen

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
              // wenn kein Raum (keine Wache) in der DB hinterlegt ist, dann Einsatz direkt wieder loeschen
              sql.db_log('Fehler-WAIP', 'Fehler: Keine Wache für den Einsatz mit der ID ' + waip_id + ' vorhanden! Einsatz wird gelöscht!');
              sql.db_einsatz_loeschen(waip_id);
            };
          });
          // pruefen ob für die beteiligten Wachen eine Verteiler-Liste hinterlegt ist, falls ja: Rueckmeldungs-Link senden
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
      };
    });
  };

  function waip_verteilen(waip_id, socket, wachen_nr) {
    // Einsatzdaten für eine Wache aus Datenbank laden und an Client verteilen
    var user_obj = socket.request.user;
    sql.db_einsatz_get_by_waipid(waip_id, wachen_nr, user_obj.id, function (einsatzdaten) {
      if (einsatzdaten) {
        // Berechtigung des Users ueberpruefen
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
          sql.db_einsatz_check_history(waip_id, einsatzdaten, socket.id, function (result) {
            if (!result) {
              // Einsatz an Client senden
              socket.emit('io.new_waip', einsatzdaten);
              sql.db_log('WAIP', 'Einsatz ' + waip_id + ' fuer Wache ' + wachen_nr + ' an Socket ' + socket.id + ' gesendet.');
              sql.db_client_update_status(socket, waip_id);
              // Sound erstellen
              tts_erstellen(app_cfg, socket.id, einsatzdaten, function (tts) {
                if (tts) {
                  // Sound-Link senden
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
        // wenn keine Einsatzdaten, dann Standby senden
        socket.emit('io.standby', null);
        sql.db_log('WAIP', 'Kein Einsatz für Wache ' + wachen_nr + ' vorhanden, Standby an Socket ' + socket.id + ' gesendet.');
        sql.db_client_update_status(socket, null);
      };
    });
  };

  function rmld_speichern(rueckmeldung, host, callback) {
    // Rueckmeldung speichern und verteilen
    proof.validate_rmld(rueckmeldung, function (valid) {
      if (valid) {
        if (!host == null) {
          host = ' von ' + host;
        };
        console.log(rueckmeldung);
        sql.db_rmld_save(rueckmeldung, function (result) {
          if (result) {
            rmld_verteilen_by_uuid(rueckmeldung.waip_uuid, rueckmeldung.rmld_uuid);
            sql.db_log('RMLD', 'Rückmeldung' + host + ' erhalten und gespeichert: ' + result);
            callback && callback(result);
          } else {
            sql.db_log('RMLD', 'Fehler beim speichern der Rückmeldung' + host + ': ' + rueckmeldung);
            callback && callback(result);
          };
        });
      };
    });
  };

  function rmld_verteilen_by_uuid(waip_uuid, rmld_uuid) {
    // Einsatz-ID mittels Einsatz-UUID ermitteln, und Rueckmelung an alle relevanten Clients verteilen
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
    // Rueckmeldung an einen bestimmten Client senden
    if (typeof socket.id !== 'undefined') {
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
    // Einsatzdaten an Dashboard senden
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

    // (alle 10 Sekunden)

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
        sql.db_rmld_get_by_waipuuid(waip.uuid, function (full_rmld) {
          // beteiligte Wachen aus den Einsatz-Rueckmeldungen filtern
          var arry_wachen = full_rmld.map(a => a.wache_nr);
          sql.db_export_get_for_rmld(arry_wachen, function (export_data) {
            // SQL gibt ist eine Schliefe (db.each), fuer jedes Ergebnis wird eine CSV/Mail erstellt
            if (export_data) {
              var part_rmld = full_rmld.filter(obj => obj.wache_id.startsWith(export_data.export_filter));
              // CSV-Spalten definieren
              var csv_col = ['id', 'einsatznummer', 'waip_uuid', 'rmld_uuid', 'alias', 'einsatzkraft', 'maschinist', 'fuehrungskraft', 'agt', 'set_time', 'arrival_time', 'wache_id', 'wache_nr', 'wache_name'];
              json2csv({
                data: part_rmld,
                fields: csv_col
              }, function (err, csv) {
                // FIXME TEST: CSV und Mail
                if (err) {
                  sql.db_log('EXPORT', 'Fehler beim erstellen der Export-CSV: ' + err);
                } else {
                  // CSV Dateiname und Pfad festlegen
                  var csv_filename = part_rmld[0].einsatznummer + '_export_rmld_' + export_data.export_name + '.csv';
                  csv_filename = process.cwd() + app_cfg.rmld.backup_path + csv_filename;
                  // CSV in Backup-Ordner speichern, falls aktiviert
                  if (app_cfg.rmld.backup_to_file) {

                    // CSV speichern
                    fs.writeFile(csv_filename, csv, function (err) {
                      if (err) {
                        sql.db_log('EXPORT', 'Fehler beim speichern der Export-CSV: ' + err);
                      };
                    });
                  };
                  // CSV per Mail versenden, falls aktiviert
                  if (app_cfg.rmld.backup_to_mail) {
                    // pruefen ob Mail plausibel ist
                    var validmail = /\S+@\S+\.\S+/;
                    if (validmail.test(export_data.export_recipient)) {
                      var mail_from = 'keineantwort@' + app_cfg.global.url.replace(/(^\w+:|^)\/\//, '');
                      var mail_subject = 'Automatischer Export Rückmeldungen Wachalarm-IP - ' + export_data.export_name + ' - Einsatz ' + part_rmld[0].einsatznummer;
                      var mail_html = 'Hallo,<br><br> anbei der automatische Export aller Einsatz-R&uuml;ckmeldungen f&uuml;r den Einsatz ' + part_rmld[0].einsatznummer + '<br><br>Mit freundlichen Gr&uuml;&szlig;en<br><br>' + app_cfg.global.company;
                      sendmail({
                        from: mail_from,
                        to: export_data.export_recipient,
                        subject: mail_subject,
                        html: mail_html,
                        attachments: [{
                          filename: csv_filename,
                          content: csv
                        }]
                      }, function (err, reply) {
                        if (!err) {
                          sql.db_log('EXPORT', 'Mail an ' + export_data.mail_subject + ' gesendet - ' + reply);
                        } else {
                          sql.db_log('EXPORT', 'Fehler beim senden der Export-Mail an ' + export_data.mail_subject + ' - ' + err + '; ' + err.stack);
                        };
                      })
                    } else {
                      sql.db_log('EXPORT', 'Fehler beim versenden der Export-Mail an ' + export_data.mail_subject + ' - keine richtige Mail-Adresse!');
                    };
                  };
                };
              });
            };
          });
          // alte Rueckmeldungen loeschen
          sql.db_rmld_loeschen(waip.uuid);
        });
        // alten Einsatz loeschen
        sql.db_einsatz_loeschen(waip.id);
        sql.db_log('WAIP', 'Einsatz-Daten zu Einsatz ' + waip.id + ' gelöscht.');
      };
    });

    // loeschen alter Sounddaten nach alter (15min) und socket-id (nicht mehr verbunden)
    fs.readdirSync(process.cwd() + app_cfg.global.soundpath).forEach(file => {
      // nur die mp3s von alten clients loeschen
      if (file.substring(0, 4) != 'bell' && file.substring(file.length - 3) == 'mp3' && file.substring(file.length - 8) != '_tmp.mp3') {
        sql.db_socket_get_by_id(file.substring(0, file.length - 4), function (data) {
          if (!data) {
            fs.unlink(process.cwd() + app_cfg.global.soundpath + file, function (err) {
              if (err) return sql.db_log('Fehler-WAIP', err);
              sql.db_log('WAIP', 'Veraltete Sound-Datei ' + file + ' wurde gelöscht.');
            });
          };
        });
      };
    });

  }, 10000);

  return {
    waip_speichern: waip_speichern,
    waip_verteilen: waip_verteilen,
    rmld_speichern: rmld_speichern,
    rmld_verteilen_for_one_client: rmld_verteilen_for_one_client,
    rmld_verteilen_by_uuid: rmld_verteilen_by_uuid,
    dbrd_verteilen: dbrd_verteilen
  };
};