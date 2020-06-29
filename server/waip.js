module.exports = function (io, sql, fs, brk, async, app_cfg) {

  // Module laden
  const {
    parse
  } = require('json2csv');
  const nodemailer = require('nodemailer');

  function waip_speichern(einsatz_daten) {
    // Einsatzmeldung in Datenbank speichern und verteilen
    sql.db_einsatz_speichern(einsatz_daten, function (waip_id) {
      sql.db_log('DEBUG', 'Neuen Einsatz mit der ID ' + waip_id + ' gespeichert.');
      // nach dem Speichern anhand der waip_id die beteiligten Wachennummern zum Einsatz ermitteln 
      sql.db_einsatz_get_rooms(waip_id, function (socket_rooms) {
        // socket_rooms muss groesser als 1 sein, da sonst nur der Standard-Raum '0' vorhanden ist
        if (socket_rooms.length > 1) {
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
          // wenn kein Raum (keine Wache) ausser '0' zurueckgeliefert wird, dann Einsatz direkt wieder loeschen weil keine Wachen dazu hinterlegt
          sql.db_log('Fehler-WAIP', 'Fehler: Keine Wache für den Einsatz mit der ID ' + waip_id + ' vorhanden! Einsatz wird gelöscht!');
          sql.db_einsatz_loeschen(waip_id);
        };
      });
      // pruefen ob für die beteiligten Wachen eine Verteiler-Liste hinterlegt ist, falls ja: Rueckmeldungs-Link senden
      sql.db_vmtl_get_list(waip_id, function (list) {
        if (list) {
          brk.alert_vmtl_list(list, function (result) {
            if (!result) {
              sql.db_log('VMTL', 'Link zur Einsatz-Rückmeldung erfolgreich an Vermittler-Liste gesendet. ' + result);
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
          sql.db_client_update_status(socket, einsatzdaten.id);
        });
        // Rueckmeldungen auslesen
        rmld_verteilen_for_one_client(einsatzdaten.id, socket, 0);
      } else {
        // Standby senden
        // BUG hier kein standby senden, sonder nicht vorhanden
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
          sql.db_rmld_get_for_export(waip.einsatznummer, waip.uuid, function (full_rmld) {
            // beteiligte Wachen aus den Einsatz-Rueckmeldungen filtern
            var arry_wachen = full_rmld.map(a => a.wache_nr);
            sql.db_export_get_for_rmld(arry_wachen, function (export_data) {
              // SQL gibt ist eine Schliefe (db.each), fuer jedes Ergebnis wird eine CSV/Mail erstellt
              if (export_data) {
                // je Export eine CSV erstellen, die nur die gewuenschten Rueckmeldungen enthaelt
                var part_rmld = full_rmld.filter(obj => String(obj.wache_nr).startsWith(String(export_data.export_filter)));
                // CSV-Spalten definieren
                var csv_col = ['id', 'einsatznummer', 'waip_uuid', 'rmld_uuid', 'alias', 'einsatzkraft', 'maschinist', 'fuehrungskraft', 'agt', 'set_time', 'arrival_time', 'wache_id', 'wache_nr', 'wache_name'];
                var opts = {
                  csv_col
                };
                try {
                  var csv = parse(part_rmld, opts);
                  // CSV Dateiname und Pfad festlegen
                  var csv_filename = export_data.export_name.replace(/[|&;$%@"<>()+,]/g, '');
                  csv_filename = csv_filename.replace(/ /g, "_");
                  csv_filename = 'einsatz_' + part_rmld[0].einsatznummer + '_export_' + csv_filename + '.csv';
                  csv_path = process.cwd() + app_cfg.rmld.backup_path;
                  // CSV in Backup-Ordner speichern, falls aktiviert
                  if (app_cfg.rmld.backup_to_file) {
                    // Ordner erstellen
                    fs.mkdir(csv_path, {
                      recursive: true
                    }, function (err) {
                      if (err) {
                        sql.db_log('EXPORT', 'Fehler beim Erstellen des Backup-Ordners: ' + err);
                      };
                      // CSV speichern
                      fs.writeFile(csv_path + csv_filename, csv, function (err) {
                        if (err) {
                          sql.db_log('EXPORT', 'Fehler beim speichern der Export-CSV: ' + err);
                        };
                      });
                    });
                  };
                  // CSV per Mail versenden, falls aktiviert
                  if (app_cfg.rmld.backup_to_mail) {
                    // pruefen ob Mail plausibel ist
                    var validmail = /\S+@\S+\.\S+/;
                    if (validmail.test(export_data.export_recipient)) {
                      // Mail-Server
                      var transport = nodemailer.createTransport({
                        host: app_cfg.rmld.mailserver_host,
                        port: app_cfg.rmld.mailserver_port,
                        secure: app_cfg.rmld.secure_mail,
                        auth: {
                          user: app_cfg.rmld.mail_user,
                          pass: app_cfg.rmld.mail_pass
                        }
                      });
                      var mail_message = {
                        from: 'Wachalarm-IP-Web <' + app_cfg.rmld.mail_from + '>',
                        to: export_data.export_recipient,
                        subject: 'Automatischer Export Wachalarm-IP-Web - ' + export_data.export_name + ' - Einsatz ' + part_rmld[0].einsatznummer,
                        html: 'Hallo,<br><br>anbei der automatische Export aller Einsatz-R&uuml;ckmeldungen f&uuml;r den Einsatz ' + part_rmld[0].einsatznummer + '<br><br>Mit freundlichen Gr&uuml;&szlig;en<br><br>' + app_cfg.public.company + '<br>',
                        attachments: [{
                          filename: csv_filename,
                          content: csv
                        }]
                      };
                      transport.sendMail(mail_message, function (err, info) {
                        if (err) {
                          sql.db_log('EXPORT', 'Fehler beim senden der Export-Mail an ' + export_data.export_recipient + ': ' + err);
                        } else {
                          sql.db_log('EXPORT', 'Mail an ' + export_data.export_recipient + ' gesendet: ' + JSON.stringify(info));
                        }
                      });
                    } else {
                      sql.db_log('EXPORT', 'Fehler beim versenden der Export-Mail an ' + export_data.export_recipient + ' - keine richtige Mail-Adresse!');
                    };
                  };
                } catch (err) {
                  sql.db_log('EXPORT', 'Fehler beim erstellen der Export-CSV: ' + err);
                };
              };
            });
            // alte Rueckmeldungen loeschen
            sql.db_rmld_loeschen(waip.uuid);
          });
          // alten Einsatz loeschen
          sql.db_einsatz_loeschen(waip.id);
          sql.db_log('WAIP', 'Einsatz-Daten zu Einsatz ' + waip.id + ' gelöscht.');
        });

      };
    });

    // loeschen alter Sounddaten nach alter (15min) und socket-id (nicht mehr verbunden)
    fs.readdirSync(process.cwd() + app_cfg.global.soundpath).forEach(file => {
      // nur die mp3s von alten clients loeschen
      if (file.substring(0, 4) != 'bell' && file.substring(file.length - 3) == 'mp3' && file.substring(file.length - 8) != '_tmp.mp3') {
        // Socket-ID aus Datei-Namen extrahieren
        socket_name = file.substring(0, file.length - 4);
        // Socket-ID anpassen, damit die SQL-Abfrage ein Ergebnis liefert
        socket_name = socket_name.replace('waip', '/waip#');
        sql.db_socket_get_by_id(socket_name, function (data) {
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
    rmld_verteilen_for_one_client: rmld_verteilen_for_one_client,
    rmld_verteilen_by_uuid: rmld_verteilen_by_uuid,
    dbrd_verteilen: dbrd_verteilen
  };
};