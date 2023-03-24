module.exports = function (db, app_cfg) {

  // Module laden
  const {
    v5: uuidv5
  } = require('uuid');
  const custom_namespace = '59cc72ec-4ff5-499d-81e2-ec49c1d01252';

  // SQL-Abfragen

  function db_einsatz_speichern(content, callback) {
    // Einsatzdaten verarbeiten
    db.run(`INSERT OR REPLACE INTO waip_einsaetze (
      id, uuid, einsatznummer, alarmzeit, einsatzart, stichwort, sondersignal, besonderheiten, ort, ortsteil, strasse, objekt, objektnr, objektart, wachenfolge, wgs84_x, wgs84_y, wgs84_area)
      VALUES (
      (select ID from waip_einsaetze where einsatznummer like \'` + content.einsatzdaten.nummer + `\'),
      \'` + content.einsatzdaten.uuid + `\',
      \'` + content.einsatzdaten.nummer + `\',
      \'` + content.einsatzdaten.alarmzeit + `\',
      \'` + content.einsatzdaten.art + `\',
      \'` + content.einsatzdaten.stichwort + `\',
      \'` + content.einsatzdaten.sondersignal + `\',
      \'` + content.einsatzdaten.besonderheiten + `\',
      \'` + content.ortsdaten.ort + `\',
      \'` + content.ortsdaten.ortsteil + `\',
      \'` + content.ortsdaten.strasse + `\',
      \'` + content.ortsdaten.objekt + `\',
      \'` + content.ortsdaten.objektnr + `\',
      \'` + content.ortsdaten.objektart + `\',
      \'` + content.ortsdaten.wachfolge + `\',
      \'` + content.ortsdaten.wgs84_x + `\',
      \'` + content.ortsdaten.wgs84_y + `\',
      \'` + JSON.stringify(content.ortsdaten.wgs84_area) + `\')`,
      function (err) {
        if (err == null) {
          // letzte Einsatz-ID ermitteln
          var id = this.lastID;
          // Schleife definieren
          function loop_done(waip_id) {
            callback && callback(waip_id);
          };
          var itemsProcessed = 0;
          // Einsatzmittel zum Einsatz speichern
          content.alarmdaten.forEach(function (item, index, array) {
            db.run(`INSERT OR REPLACE INTO waip_einsatzmittel (id, waip_einsaetze_ID, waip_wachen_ID, wachenname, einsatzmittel, zeitstempel)
              VALUES (
              (select ID from waip_einsatzmittel where einsatzmittel like \'` + item.einsatzmittel + `\'),
              \'` + id + `\',
              (select id from waip_wachen where name_wache like \'` + item.wachenname + `\'),
              \'` + item.wachenname + `\',
              \'` + item.einsatzmittel + `\',
              \'` + item.zeit_a + `\')`,
              function (err) {
                if (err == null) {
                  // Schleife erhoehen
                  itemsProcessed++;
                  if (itemsProcessed === array.length) {
                    // Schleife beenden
                    loop_done(id);
                  };
                } else {
                  callback && callback(err);
                };
              });
          });
        } else {
          callback && callback(err);
        };
      });
  };

  function db_einsatz_ermitteln(wachen_id, socket, callback) {
    // ermittelt des letzten vorhanden Einsatz zu einer Wache
    var select_reset_counter;
    var user_id = socket.request.user.id;
    var dts = app_cfg.global.default_time_for_standby;
    // wenn Wachen-ID 0 ist, dann % setzen
    if (parseInt(wachen_id) == 0) {
      wachen_id = '%'
    };
    // wenn user_id keine zahl ist, dann default_time_for_standby setzen
    if (isNaN(user_id)) {
      select_reset_counter = dts;
    } else {
      // wenn user_id vorhanden, aber keine config, dann dts COALESCE(MAX(reset_counter), xxx)
      select_reset_counter = `(SELECT COALESCE(MAX(reset_counter), ` + dts + `)
      reset_counter FROM waip_user_config WHERE user_id = ` + user_id + `)`;
    };
    // Einsätze für die gewählte Wachen_ID ermittel, und Ablaufzeit beachten
    db.all(`SELECT waip_einsaetze_ID FROM
    	(
      	SELECT em.waip_einsaetze_ID, we.zeitstempel FROM waip_einsatzmittel em
      	LEFT JOIN waip_wachen wa 	ON wa.id = em.waip_wachen_id
      	LEFT JOIN waip_einsaetze we ON we.id = em.waip_einsaetze_ID
      	WHERE wa.nr_wache LIKE ?||\'%\'
      	GROUP BY em.waip_einsaetze_id
      	ORDER BY em.waip_einsaetze_id DESC
    	)
      WHERE DATETIME(zeitstempel, \'+\' || ` + select_reset_counter + ` || \' minutes\')
      	> DATETIME(\'now\', \'localtime\')`, [wachen_id],
      function (err, rows) {
        if (err == null && rows.length > 0) {
          //callback && callback(row.waip_einsaetze_ID); ALT
          callback && callback(rows);
        } else {
          callback && callback(null);
        };
      });
  };

  function db_einsatz_check_uuid(uuid, callback) {
    // Einsatz mit dieser UUID vorhanden?        
    db.get('select uuid from waip_einsaetze where uuid like ?', [uuid], function (err, row) {
      if (err == null && row) {
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_check_history(waip_id, einsatzdaten, socket_id, callback) {
    // Prüfen ob Wachalarm bereits in dieser Form an diesen Socket gesendet wurde (Doppelalarmierung vermeiden)
    // neues Object mit Einsatzdaten erstellen
    var missiondata = Object.assign({}, einsatzdaten);
    // Einsatzdaten in kuzre UUID-Strings umwandeln, diese UUIDs werden dann verglichen
    var uuid_em_alarmiert = uuidv5(JSON.stringify(missiondata.em_alarmiert), custom_namespace);
    delete missiondata.em_alarmiert;
    var uuid_em_weitere = uuidv5(JSON.stringify(missiondata.em_weitere), custom_namespace);
    delete missiondata.em_weitere;
    delete missiondata.zeitstempel;
    delete missiondata.ablaufzeit;
    delete missiondata.wgs84_x;
    delete missiondata.wgs84_y;
    delete missiondata.wgs84_area;
    var uuid_einsatzdaten = uuidv5(JSON.stringify(missiondata), custom_namespace);
    // Abfrage ob zu Socket und Waip-ID bereits History-Daten hinterlegt sind
    db.get('select * from waip_history where waip_uuid like (select uuid from waip_einsaetze where id = ?) and socket_id like ?', [waip_id, socket_id], function (err, row) {
      // uuid_einsatz_grunddaten, uuid_em_alarmiert, uuid_em_weitere 
      if (err == null && row) {
        // wenn History-Daten hinterlegt sind, dann pruefen sich etwas verändert hat
        if (uuid_einsatzdaten !== row.uuid_einsatz_grunddaten || uuid_em_alarmiert !== row.uuid_em_alarmiert) {
          // Grunddaten oder alarmierte Einsatzmittel haben sich verändert, somit History veraltet und neue Alarmierung notwendig
          callback && callback(false);
        } else {
          // relevante Daten haben sich nicht geändert
          callback && callback(true);
        };
        // History mit aktuellen Daten aktualsieren
        db.run(`UPDATE waip_history
          SET 
          uuid_einsatz_grunddaten=\'` + uuid_einsatzdaten + `\',
          uuid_em_alarmiert=\'` + uuid_em_alarmiert + `\',
          uuid_em_weitere=\'` + uuid_em_weitere + `\' 
          WHERE waip_uuid like (select uuid from waip_einsaetze where id = \'` + waip_id + `\') and socket_id like \'` + socket_id + `\'`);
      } else {
        // wenn keine History-Daten hinterlegt sind, diese speichern
        db.run(`INSERT INTO waip_history (waip_uuid, socket_id, uuid_einsatz_grunddaten, uuid_em_alarmiert, uuid_em_weitere)
          VALUES (
          (select uuid from waip_einsaetze where id = \'` + waip_id + `\'),
          \'` + socket_id + `\',
          \'` + uuid_einsatzdaten + `\',
          \'` + uuid_em_alarmiert + `\',
          \'` + uuid_em_weitere + `\')`);
        // callback History = false
        callback && callback(false);
      };
    });
  };

  function db_einsatz_get_by_waipid(waip_id, wachen_nr, user_id, callback) {
    // Einsatzdaten entsprechend der WAIP-ID zusammentragen
    // falls waip_id oder wachen_nur keine zahlen sind, Abbruch
    if (isNaN(waip_id) || isNaN(wachen_nr)) {
      callback && callback(null);
    } else {
      var len = wachen_nr.toString().length
      // wachen_nr muss 2, 4 oder 6 Zeichen lang sein
      if (parseInt(wachen_nr) != 0 && len != 2 && len != 4 && len != 6 && len == null) {
        callback && callback(null);
      } else {
        // wenn wachen_nr 0, dann % fuer Abfrage festlegen
        if (parseInt(wachen_nr) == 0) {
          wachen_nr = '%'
        };
        // wenn keine user_id, dann Default-Anzeige-Zeit setzen
        if (isNaN(user_id)) {
          user_id = app_cfg.global.default_time_for_standby;
        };
        // Einsatz mit ID finden, je nach laenge der wachen_nr andere SQL ausfuehren
        db.get(`SELECT
          e.id,
          e.uuid,
          DATETIME(e.zeitstempel) zeitstempel,
        	DATETIME(e.zeitstempel,	'+' || (
            SELECT COALESCE(MAX(reset_counter), ?) reset_counter FROM waip_user_config WHERE user_id = ?
            ) || ' minutes') ablaufzeit,
          e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT,e.ORTSTEIL, e.STRASSE,
          e.BESONDERHEITEN, e.wgs84_x, e.wgs84_y, em1.EM_ALARMIERT, em0.EM_WEITERE, e.wgs84_area
          FROM WAIP_EINSAETZE e
          LEFT JOIN (
            SELECT waip_einsaetze_id, \'[\' || group_concat(\'{\"name\": \"\' || einsatzmittel || \'\", \"zeit\": \"\' || zeitstempel || \'\"}\') || \']\' AS em_alarmiert
            FROM WAIP_EINSATZMITTEL WHERE waip_einsaetze_id = ? and waip_wachen_id in (
              select id from waip_wachen where nr_wache like ?||\'%\')
              GROUP BY waip_einsaetze_id
            ) em1 ON em1.waip_einsaetze_id = e.ID
          LEFT JOIN (
            SELECT waip_einsaetze_id, \'[\' || group_concat(\'{\"name\": \"\' || einsatzmittel || \'\", \"zeit\": \"\' || zeitstempel || \'\"}\') || \']\' AS em_weitere
            FROM waip_einsatzmittel WHERE waip_einsaetze_id = ? and (waip_wachen_id not in (
              select id from waip_wachen where nr_wache like ?||\'%\') or waip_wachen_id is null)
              GROUP BY waip_einsaetze_id
            ) em0 ON em0.waip_einsaetze_id = e.ID
          WHERE e.id LIKE ?
          ORDER BY e.id DESC LIMIT 1`,
          [app_cfg.global.default_time_for_standby, user_id, waip_id, wachen_nr, waip_id, wachen_nr, waip_id],
          function (err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            }
          });
      };
    };
  };

  function db_einsatz_get_by_uuid(waip_uuid, callback) {
    // Einsatz mit UUID finden
    db.get(`SELECT e.id, e.uuid, e.ZEITSTEMPEL, e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT, 
      e.ORTSTEIL, e.STRASSE, e.BESONDERHEITEN, e.wgs84_x, e.wgs84_y, e.wgs84_area FROM WAIP_EINSAETZE e 
      WHERE e.uuid like ?`, [waip_uuid], function (err, row) {
      if (err == null && row) {
        // Einsatzmittel zu dem Einsatz finden und hinzufuegen
        db.all(`SELECT e.einsatzmittel, e.status, e.wachenname FROM waip_einsatzmittel e 
          WHERE e.waip_einsaetze_id = ?`, [row.id], function (err, rows) {
          if (err == null && rows) {
            var einsatzdaten = row;
            einsatzdaten.einsatzmittel = rows;
            // Wachen zum Einsatz finden und hinzufuegen
            db.all(`SELECT DISTINCT e.waip_wachen_ID, e.wachenname FROM waip_einsatzmittel e 
              WHERE e.waip_einsaetze_id = ?`, [row.id], function (err, wachen) {
              if (err == null && wachen) {
                einsatzdaten.wachen = wachen;
                callback && callback(einsatzdaten);
              } else {
                callback && callback(null);
              };
            });
          } else {
            callback && callback(null);
          };
        });
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_get_uuid_by_enr(einsatz_nr, callback) {
    // mit uuid die zugehoerige id des Einsatzes finden
    db.get(`select uuid from waip_einsaetze where einsatznummer like ?`, [einsatz_nr], function (err, row) {
      if (err == null && row) {
        callback && callback(row.uuid);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_get_waipid_by_uuid(waip_uuid, callback) {
    // mit uuid die zugehoerige id des Einsatzes finden
    db.get(`SELECT id FROM WAIP_EINSAETZE WHERE uuid like ?`, [waip_uuid], function (err, row) {
      if (err == null && row) {
        callback && callback(row.id);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_get_active(callback) {
    // alle aktivieren Einsaetze finden
    db.all(`select we.uuid, we.einsatzart, we.stichwort, we.ort, we.ortsteil, we.wgs84_area,
    GROUP_concat(DISTINCT substr( wa.nr_wache, 0, 3 )) a,
    GROUP_concat(DISTINCT substr( wa.nr_wache, 0, 5 )) b,
    GROUP_concat(DISTINCT wa.nr_wache) c
    from waip_einsaetze we
    left join waip_einsatzmittel em on em.waip_einsaetze_ID = we.id
    left join waip_wachen wa on wa.id = em.waip_wachen_ID
    GROUP by we.id
    ORDER by we.einsatzart, we.stichwort`, function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_get_rooms(waip_id, callback) {
    // alle potenziellen Socket-Rooms fuer einen Einsatz finden
    db.all(`select '0' room
      union all
      select w.nr_kreis room from waip_wachen w
      left join waip_einsatzmittel em on em.wachenname = w.name_wache
      where em.waip_einsaetze_ID = ? group by w.nr_kreis
      union all
      select w.nr_kreis || w.nr_traeger room from waip_wachen w
      left join waip_einsatzmittel em on em.wachenname = w.name_wache
      where em.waip_einsaetze_ID = ? group by w.nr_kreis || w.nr_traeger
      union all
      select w.nr_wache room from waip_wachen w
      left join waip_einsatzmittel em on em.wachenname = w.name_wache
      where em.waip_einsaetze_ID = ? group by w.nr_wache`, [waip_id, waip_id, waip_id],
      function (err, rows) {
        if (err == null && rows.length > 0) {
          callback && callback(rows);
        } else {
          callback && callback(null);
        };
      });
  };

  function db_einsatz_get_old(minuten, callback) {
    // veraltete Einsaetze finden
    db.each('SELECT id, uuid, einsatznummer FROM waip_einsaetze WHERE zeitstempel <= datetime(\'now\', \'localtime\', \'-' + minuten + ' minutes\')', function (err, row) {
      if (err == null && row) {
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_count_all(callback) {
    // alle aktivieren Einsaetze finden
    db.get(`select count(*) from waip_einsaetze`, function (err, row) {
      if (err == null && row) {
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_einsatz_loeschen(id) {
    // Einsatzdaten loeschen
    db.serialize(function() {
      // History loeschen
      db.run(`DELETE FROM waip_history WHERE waip_uuid = (select uuid from waip_einsaetze where id = ?)`, [id]);
      // Einsatz loeschen
      db.run(`DELETE FROM waip_einsaetze WHERE id = ?`, [id]);
    });    
  };

  function db_wache_get_all(callback) {
    db.all(`select 'wache' typ, nr_wache nr, name_wache name from waip_wachen  where nr_wache is not '0'
      union all
      select 'traeger' typ, nr_kreis || nr_traeger nr, name_traeger name from waip_wachen where nr_kreis is not '0' group by name_traeger 
      union all
      select 'kreis' typ, nr_kreis nr, name_kreis name from waip_wachen group by name_kreis 
      order by typ, name`, function (err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_wache_vorhanden(wachen_nr, callback) {
    // Prueffunktion um zu erkennen ob wachen_nr valide ist
    if (isNaN(wachen_nr)) {
      // Fehler: Wachennummer nicht korrekt.
      callback && callback(null);
    } else {
      var len = wachen_nr.toString().length
      // wachen_nr muss 2, 4 oder 6 Zeichen lang sein
      if (parseInt(wachen_nr) != 0 && len != 2 && len != 4 && len != 6) {
        // Fehler: Wachennummer nicht plausibel.
        callback && callback(null);
      } else {
        // je nach laenge andere SQL ausfuehren
        if (parseInt(wachen_nr) == 0) {
          db.get('select \'1\' length, nr_wache nr, name_wache name from waip_wachen where nr_wache like ?', [wachen_nr], function (err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
        if (len == 2) {
          db.get('select \'2\' length, nr_kreis nr, name_kreis name from waip_wachen where nr_kreis like SUBSTR(?,-2, 2) group by name_kreis LIMIT 1', [wachen_nr], function (err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
        if (len == 4) {
          db.get('select \'4\' length, nr_kreis || nr_traeger nr, name_traeger name from waip_wachen where nr_kreis like SUBSTR(?,-4, 2) and nr_traeger like SUBSTR(?,-2, 2) group by name_traeger LIMIT 1', [wachen_nr, wachen_nr], function (err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
        if (len == 6) {
          db.get('select \'6\' length, nr_wache nr, name_wache name from waip_wachen where nr_wache like ?', [wachen_nr], function (err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
      };
    };
  };

  function db_tts_einsatzmittel(einsatzmittel, callback) {
    // Funkkenner der Einsatzmittel in gesprochen Text umwandeln, wenn Nomierung mit xx xx 00/00-00
    var tmp = einsatzmittel.name.match(/(\d\d\-\d\d)/g);
    if (tmp) {
      // Einsatzmittel-Typ ermitteln
      var typ = tmp.toString().substring(0, 2);
      // Einsatzmittel-Nr ermitteln
      var nr = tmp.toString().slice(4);
      nr = nr.toString().replace(/^0+/, '');
      // hinterlegte Ersetzungen finden
      db.get('SELECT einsatzmittel_rufname name FROM waip_ttsreplace WHERE einsatzmittel_typ = ?', [typ], function (err, row) {
        if (err == null && row) {
          callback(null, row.name + ' ' + nr);
        } else {
          callback(null, einsatzmittel.name);
        };
      });
    } else {
      callback(null, einsatzmittel.name);
    };
  };

  function db_client_update_status(socket, client_status) {
    // Client-Status aktualisieren / speichern
    var user_name = socket.request.user.user;
    var user_permissions = socket.request.user.permissions;
    var user_agent = socket.request.headers['user-agent'];
    var client_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    var reset_timestamp = socket.request.user.reset_counter;
    // Standby wenn Client-Status keine Nummer oder Null
    if (isNaN(client_status) || client_status == null) {
      client_status = 'Standby';
    };
    // wenn User-Name nicht bekannt
    if (typeof user_name === "undefined") {
      user_name = '';
    };
    // wenn User-Berechtigung nicht bekannt
    if (typeof user_permissions === "undefined") {
      user_permissions = '';
    };
    // wenn Anzeigezeit nicht bekannt, Wert aus App-Cfg setzen
    if ((typeof reset_timestamp === "undefined") || (reset_timestamp == null)) {
      reset_timestamp = app_cfg.global.default_time_for_standby;
    };
    // Daten speichern
    db.run(`insert or replace into waip_clients 
      (id, socket_id, client_ip, room_name, client_status, user_name, user_permissions, user_agent, reset_timestamp ) values (
      (select id from waip_clients where socket_id = \'` + socket.id + `\'),
      \'` + socket.id + `\',
      \'` + client_ip + `\',
      \'` + socket.rooms[Object.keys(socket.rooms)[0]] + `\',
      \'` + client_status + `\',
      \'` + user_name + `\',
      \'` + user_permissions + `\',
      \'` + user_agent + `\',
      (select DATETIME(zeitstempel, \'+\' || ` + reset_timestamp + ` || \' minutes\') from waip_einsaetze where id =\'` + client_status + `\'));`);
  };

  function db_client_get_connected(callback) {
    // Verbunden Clients ermitteln
    db.all(`select * from waip_clients`, function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_client_delete(socket) {
    // Client aus Liste entfernen
    db.run('DELETE FROM waip_clients ' +
      'WHERE socket_id = ?', socket.id);
  };

  function db_client_check_waip_id(socketId, waip_id, callback) {
    // Pruefen ob fuer Client eine Einsatz vorhanden ist
    db.get('SELECT client_status id from waip_clients where socket_id like ?', [socketId], function (err, row) {
      if (err == null && row) {
        if (row.id == waip_id) {
          callback && callback(row);
        } else {
          callback && callback(null);
        };
      } else {
        callback && callback(null);
      };
    });
  };

  function db_log(typ, text) {
    // Debug Eintraege nur bei Development speichern 
    var do_log = true;
    var debug_regex = new RegExp('debug', 'gi');
    if (typ.match(debug_regex)) {
      do_log = app_cfg.global.development;
    } else {
      do_log = true;
    };
    // Log-Eintrag schreiben
    if (do_log) {
      db.run(`INSERT INTO waip_log (log_typ, log_text)
        VALUES (
        \'` + typ + `\',
        \'` + text + `\')`);
    };
    // Log auf 50.000 Datensätze begrenzen um Speicherplatz der DB zu begrenzen
    db.run(`DELETE FROM waip_log WHERE id IN
      (
        SELECT id FROM waip_log ORDER BY id DESC LIMIT 50000, 100
      )`);
  };

  function db_log_get_5000(callback) {
    // letzten 5000 Log-Eintraege ermitteln
    db.all(`select * from waip_log order by id desc LIMIT 5000`, function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_socket_get_by_id(content, callback) {
    // Client-Eintrag per Socket-ID finden
    db.get('select * from waip_clients where socket_id = ? ', [content], function (err, row) {
      if (err == null && row) {
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_socket_get_by_room(content, callback) {
    // Client-Eintrag per Socket-ID finden
    db.get('select socket_id from waip_clients where room_name = ? ', [content], function (err, row) {
      if (err == null && row) {
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_socket_get_dbrd(waip_id, callback) {
    // Client-Eintrag per Socket-ID finden
    db.all('select socket_id from waip_clients where client_status = ? and socket_id like \'/dbrd#%\'', [waip_id], function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_socket_get_all_to_standby(callback) {
    // alle Sockets/Clients finden, die auf Standby gesetzt werden koennen 
    db.all(`select socket_id from waip_clients
      where reset_timestamp < DATETIME(\'now\', \'localtime\')`, function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_user_set_config(user_id, reset_counter, callback) {
    // reset_counter validieren, ansonsten default setzen
    if (!(reset_counter >= 1 && reset_counter <= app_cfg.global.time_to_delete_waip)) {
      reset_counter = app_cfg.global.default_time_for_standby;
    };
    // Benutzer-Einstellungen speichern
    db.run((`INSERT OR REPLACE INTO waip_user_config
      (id, user_id, reset_counter)
      VALUES (
      (select ID from waip_user_config where user_id like \'` + user_id + `\'),
      \'` + user_id + `\',
      \'` + reset_counter + `\')`), function (err) {
      if (err == null) {
        callback && callback();
      } else {
        callback && callback(null);
      };
    });
  };

  function db_user_get_config(user_id, callback) {
    // Benutzer-Einstellungen laden
    db.get(`SELECT reset_counter FROM waip_user_config
      WHERE user_id = ?`, [user_id], function (err, row) {
      if (err == null && row) {
        callback && callback(row.reset_counter);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_user_get_all(callback) {
    // alle Benutzer laden
    db.all('SELECT id, user, permissions, ip_address FROM waip_users', function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_user_check_permission(user_obj, waip_id, callback) {
    // Benutzer-Berechtigung pruefen
    if (user_obj && user_obj.permissions) {
      // Admin?
      if (user_obj.permissions == 'admin') {
        callback && callback(true);
      } else {
        // Berechtigungen -> 52,62,6690,....
        db.get(`select group_concat(DISTINCT wa.nr_wache) wache from waip_einsatzmittel em
          left join waip_wachen wa on wa.id = em.waip_wachen_ID
          where waip_einsaetze_ID = ?`, [waip_id], function (err, row) {
          if (err == null && row) {
            // Berechtigung fuer diesen Einsatz (beteilgte Wache) gegeben?
            var permission_arr = user_obj.permissions.split(",");
            const found = permission_arr.some(r => row.wache.search(RegExp(',' + r + '|\\b' + r)) >= 0);
            if (found) {
              callback && callback(true);
            } else {
              callback && callback(false);
            };
          } else {
            callback && callback(false);
          };
        });
      };
    } else {
      callback && callback(false);
    };
  };

  function db_rmld_save(responseobj, callback) {
    // Rueckmeldung speichern
    var reuckmeldung = {};
    reuckmeldung.rmld_uuid = responseobj.rmld_uuid;
    reuckmeldung.waip_uuid = responseobj.waip_uuid;
    // Typ der Einsatzfunktion festlegen
    switch (responseobj.radio_efunction) {
      case 'ek':
        reuckmeldung.einsatzkraft = 1;
        reuckmeldung.maschinist = 0;
        reuckmeldung.fuehrungskraft = 0;
        break;
      case 'ma':
        reuckmeldung.einsatzkraft = 0;
        reuckmeldung.maschinist = 1;
        reuckmeldung.fuehrungskraft = 0;
        break;
      case 'fk':
        reuckmeldung.einsatzkraft = 0;
        reuckmeldung.maschinist = 0;
        reuckmeldung.fuehrungskraft = 1;
        break;
      default:
        reuckmeldung.einsatzkraft = 0;
        reuckmeldung.maschinist = 0;
        reuckmeldung.fuehrungskraft = 0;
    };
    // ist AGT ja / nein
    if (responseobj.cb_agt) {
      reuckmeldung.agt = 1;
    } else {
      reuckmeldung.agt = 0;
    };
    // Zeitpunkt der Rueckmeldung festlegen
    reuckmeldung.set_time = new Date();
    // Zeitpunkt der geplanten Ankunft festlegen
    var resp_time = new Date();
    resp_time.setMinutes(resp_time.getMinutes() + parseInt(responseobj.eintreffzeit));
    reuckmeldung.arrival_time = resp_time;
    // Wache gesetzt?
    if (!isNaN(responseobj.wachenauswahl)) {
      reuckmeldung.wache_id = responseobj.wachenauswahl;
    } else {
      reuckmeldung.wache_id = null;
    };
    // Rueckmeldung der Wache zuordnen
    db.get(`select name_wache, nr_wache from waip_wachen where id = ?;`, [reuckmeldung.wache_id], function (err, row) {
      if (err == null && row) {
        reuckmeldung.wache_name = row.name_wache;
        reuckmeldung.wache_nr = row.nr_wache;
        // Rueckmeldung in DB speichern
        db.run((`insert or replace into waip_response (id, waip_uuid, rmld_uuid, einsatzkraft, maschinist, fuehrungskraft, agt, set_time, arrival_time, wache_id, wache_nr, wache_name) 
        values
        ((select id from waip_response where rmld_uuid =  \'` + reuckmeldung.rmld_uuid + `\'), 
        \'` + reuckmeldung.waip_uuid + `\', 
        \'` + reuckmeldung.rmld_uuid + `\', 
        \'` + reuckmeldung.einsatzkraft + `\', 
        \'` + reuckmeldung.maschinist + `\', 
        \'` + reuckmeldung.fuehrungskraft + `\', 
        \'` + reuckmeldung.agt + `\', 
        \'` + reuckmeldung.set_time + `\', 
        \'` + reuckmeldung.arrival_time + `\', 
        \'` + reuckmeldung.wache_id + `\', 
        \'` + reuckmeldung.wache_nr + `\', 
        \'` + reuckmeldung.wache_name + `\')`), function (err) {
          if (err == null) {
            // Rueckmeldung-UUID zurückgeben
            callback && callback(reuckmeldung.rmld_uuid);
          } else {
            callback && callback(null);
          };
        });
      } else {
        callback && callback(null);
      };
    });
  };

  function db_rmld_get_fuer_wache(waip_einsaetze_id, wachen_nr, callback) {
    // Rueckmeldungen fuer eine Wache auslesen
    db.all(`SELECT * FROM waip_response WHERE waip_uuid = (select uuid from waip_einsaetze where id = ?)`, [waip_einsaetze_id], function (err, rows) {
      if (err == null && rows) {
        // temporaere Variablen
        var itemsProcessed = 0;
        var all_responses = [];
        // callback-function fuer absgeschlossene Schleife
        function loop_done(all_responses) {
          callback && callback(all_responses);
        };
        // summiertes JSON-Rueckmeldeobjekt für die angeforderte Wachennummer erstellen
        rows.forEach(function (item, index, array) {
          var tmp = JSON.stringify(item.wache_nr);
          if (tmp.startsWith(wachen_nr) || wachen_nr == 0) {
            if (item.einsatzkraft == 1) {
              item.einsatzkraft = true;
            } else {
              item.einsatzkraft = false;
            };
            if (item.maschinist == 1) {
              item.maschinist = true;
            } else {
              item.maschinist = false;
            };
            if (item.fuehrungskraft == 1) {
              item.fuehrungskraft = true;
            } else {
              item.fuehrungskraft = false;
            };
            if (item.agt == 1) {
              item.agt = true;
            } else {
              item.agt = false;
            };
            // Rueckmeldeobjekt aufsummieren
            all_responses.push(item)
          };
          // Schleife ggf. beenden
          itemsProcessed++;
          if (itemsProcessed === array.length) {
            loop_done(all_responses);
          };
        });
      } else {
        callback && callback(null);
      };
    });
  };

  function db_rmld_get_by_rmlduuid(rmld_uuid, callback) {
    // einzelne Rueckmeldung fuer eine Rueckmelde-UUID
    db.all(`SELECT * FROM waip_response WHERE rmld_uuid like ?`, [rmld_uuid], function (err, row) {
      if (err == null && row) {
        if (row.einsatzkraft == 1) {
          row.einsatzkraft = true;
        } else {
          row.einsatzkraft = false;
        };
        if (row.maschinist == 1) {
          row.maschinist = true;
        } else {
          row.maschinist = false;
        };
        if (row.fuehrungskraft == 1) {
          row.fuehrungskraft = true;
        } else {
          row.fuehrungskraft = false;
        };
        if (row.agt == 1) {
          row.agt = true;
        } else {
          row.agt = false;
        };
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_rmld_get_for_export(waip_einsatznummer, waip_uuid, callback) {
    // alle Rueckmeldungen fuer einen Einsatz ermitteln
    db.all(`SELECT ? einsatznummer, wr.id, wr.waip_uuid, wr.rmld_uuid, wr.einsatzkraft, wr.maschinist, wr.fuehrungskraft, 
      wr.agt, wr.set_time, wr.arrival_time, wr.wache_id, wr.wache_nr, wr.wache_name
      FROM waip_response wr WHERE wr. waip_uuid like ?`, [waip_einsatznummer, waip_uuid], function (err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_rmld_loeschen(waip_uuid) {
    // Rueckmeldungen löschen
    db.run(`DELETE FROM waip_response WHERE waip_uuid = ?`, [waip_uuid]);
  };

  function db_vmtl_get_list(waip_id, callback) {
    // Pruefen ob fuer eine Wache im Einsatz ein Verteilerliste hinterlegt ist
    db.get(`select v.waip_wachenname, v.vmtl_typ, v.vmtl_account_name, v.vmtl_account_group from waip_vmtl v 
      where v.waip_wachenname in (select distinct w.name_wache waip_wachenname from waip_wachen w left join waip_einsatzmittel em on em.wachenname = w.name_wache 
      where em.waip_einsaetze_ID = ?)`, [waip_id], function (err, liste) {
      if (err == null && liste) {
        // waip_id zu Daten hinzufuegen
        liste.waip_id = waip_id;
        callback && callback(liste);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_telegram_get_chats(waip_id, callback) {
    // Pruefen, welche Telegram-Chats fuer eine bestimmte Wache hinterlegt sind
    db.all(`select distinct tg.tg_chat_id from waip_telegram_chats tg,
        (select nr_wache from waip_wachen w left join waip_einsatzmittel em on em.wachenname = w.name_wache where em.waip_einsaetze_ID = ?) wa
      where wa.nr_wache like tg.waip_wache_nr||'%'`, [waip_id], function (err, liste) {
      if (err == null && liste) {
        callback && callback(liste);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_telegram_get_wachen(chat_id, callback) {
    // Pruefen, welche Wachen fuer einen bestimmten Telegram-Chat hinterlegt sind
    db.all(`select tg.waip_wache_nr, tg.waip_wache_name from waip_telegram_chats tg
      where tg.tg_chat_id = ?`, [chat_id], function (err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  }

  function db_telegram_add_chat(chat_id, wache_nr, wache_name) {
    db.run(`insert or replace into waip_telegram_chats
      (tg_chat_id, waip_wache_nr, waip_wache_name) values (?,?,?)`, [chat_id, wache_nr, wache_name]);
  }

  function db_telegram_remove_chat(chat_id, wache_nr) {
    db.run(`delete from waip_telegram_chats
      where tg_chat_id = ? and waip_wache_nr = ?`, [chat_id, wache_nr]);
  }

  function db_vmtl_get_tw_account(list_data, callback) {
    // falls Liste für Wache hinterlegt, dann hier die Twitter-Account-Daten, Einsatz-UUID, Einsatzart und Wachenname auslesen
    db.get(`select tw.tw_screen_name, tw.tw_consumer_key, tw.tw_consumer_secret, tw.tw_access_token_key, tw.tw_access_token_secret, we.uuid, we.einsatzart, we.stichwort, wa.name_wache 
    from waip_tw_accounts tw, waip_einsaetze we, waip_wachen wa
    where tw.tw_screen_name = ? AND we.id = ? AND wa.name_wache like ?`, [list_data.vmtl_account_name, list_data.waip_id, list_data.waip_wachenname], function (err, vmtl_daten) {
      if (err == null && vmtl_daten) {
        // Listen-Name zu Daten hinzufuegen
        vmtl_daten.list = list_data.vmtl_account_group;
        callback && callback(vmtl_daten);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_vmtl_check_history(vmtl_data, list_data, callback) {
    // pruefen obe für diesen Liste bereits eine Alarmierung erfolgte
    var uuid_vmlt_history = uuidv5(vmtl_data.uuid + vmtl_data.einsatzart + vmtl_data.stichwort + vmtl_data.name_wache + vmtl_data.list, custom_namespace);
    db.get('select vmtl_history from waip_vmtl where vmtl_history like ?', [uuid_vmlt_history], function (err, row) {
      // Abfrage bring eine Zeile? -> Alarmierung bereits erfolgt
      if (err == null && row) {
        // Liste wurde bereits zu diesem Einsatz beschickt
        callback && callback(true);
      } else {
        // wenn keine History-Daten hinterlegt sind, diese speichern
        db.run(`UPDATE waip_vmtl
        SET 
        vmtl_history=\'` + uuid_vmlt_history + `\'
        WHERE waip_wachenname like \'` + list_data.waip_wachenname + `\'
        AND vmtl_typ like \'` + list_data.vmtl_typ + `\'
        AND vmtl_account_name like \'` + list_data.vmtl_account_name + `\'
        AND vmtl_account_group like \'` + list_data.vmtl_account_group + `\'`);
        // Liste wurde noch nicht zu diesem Einsatz beschickt
        callback && callback(false);
      };
    });
  };

  function db_export_get_for_rmld(arry_wachen, callback) {
    // saubere String-Werte erstellen
    arry_wachen = arry_wachen.map(String);
    // Wachen-Nummern um Teil-Nummern fuer Kreis und Treager ergaenzen
    var kreis = arry_wachen.map(i => i.substr(0, 2));
    var traeger = arry_wachen.map(i => i.substr(0, 4));
    arry_wachen = arry_wachen.concat(kreis);
    arry_wachen = arry_wachen.concat(traeger);
    // doppelte Elemente aus Array entfernen
    arry_wachen = arry_wachen.filter((v, i, a) => a.indexOf(v) === i);
    // DEBUG
    if (app_cfg.global.development) {
      console.log('Export-Liste RMLD: ' + JSON.stringify(arry_wachen));
    };
    // nur weiter machen wenn arry_wachen nicht leer, weil z.b. keine Rueckmeldungen vorhanden sind
    if (arry_wachen.length > 0) {
      // Export-Liste auslesen
      db.each(`select * from waip_export where export_typ like \'rmld\' and (export_filter IN (` + arry_wachen.join(', ') + `) or export_filter like \'\')`, function (err, row) {
        if (err == null && row) {
          callback && callback(row);
        } else {
          callback && callback(null);
        };
      });
    } else {
      callback && callback(null);
    };
  };

  return {
    db_einsatz_speichern: db_einsatz_speichern,
    db_einsatz_ermitteln: db_einsatz_ermitteln,
    db_einsatz_check_uuid: db_einsatz_check_uuid,
    db_einsatz_check_history: db_einsatz_check_history,
    db_einsatz_get_by_waipid: db_einsatz_get_by_waipid,
    db_einsatz_get_by_uuid: db_einsatz_get_by_uuid,
    db_einsatz_get_uuid_by_enr: db_einsatz_get_uuid_by_enr,
    db_einsatz_get_waipid_by_uuid: db_einsatz_get_waipid_by_uuid,
    db_einsatz_get_active: db_einsatz_get_active,
    db_einsatz_get_rooms: db_einsatz_get_rooms,
    db_einsatz_get_old: db_einsatz_get_old,
    db_einsatz_count_all: db_einsatz_count_all,
    db_einsatz_loeschen: db_einsatz_loeschen,
    db_wache_get_all: db_wache_get_all,
    db_wache_vorhanden: db_wache_vorhanden,
    db_tts_einsatzmittel: db_tts_einsatzmittel,
    db_client_update_status: db_client_update_status,
    db_client_get_connected: db_client_get_connected,
    db_client_delete: db_client_delete,
    db_client_check_waip_id: db_client_check_waip_id,
    db_log: db_log,
    db_log_get_5000: db_log_get_5000,
    db_socket_get_by_id: db_socket_get_by_id,
    db_socket_get_by_room: db_socket_get_by_room,
    db_socket_get_dbrd: db_socket_get_dbrd,
    db_socket_get_all_to_standby: db_socket_get_all_to_standby,
    db_user_set_config: db_user_set_config,
    db_user_get_config: db_user_get_config,
    db_user_get_all: db_user_get_all,
    db_user_check_permission: db_user_check_permission,
    db_rmld_save: db_rmld_save,
    db_rmld_get_fuer_wache: db_rmld_get_fuer_wache,
    db_rmld_get_by_rmlduuid: db_rmld_get_by_rmlduuid,
    db_rmld_get_for_export: db_rmld_get_for_export,
    db_rmld_loeschen: db_rmld_loeschen,
    db_vmtl_get_list: db_vmtl_get_list,
    db_vmtl_check_history: db_vmtl_check_history,
    db_vmtl_get_tw_account: db_vmtl_get_tw_account,
    db_telegram_get_chats: db_telegram_get_chats,
    db_telegram_get_wachen: db_telegram_get_wachen,
    db_telegram_add_chat: db_telegram_add_chat,
    db_telegram_remove_chat: db_telegram_remove_chat,
    db_export_get_for_rmld: db_export_get_for_rmld
  };

};

/* alte abfragen


    db_einsatz_laden: db_einsatz_laden,
db_list_wachen: db_list_wachen,
    db_wache_nr_ermitteln: db_wache_nr_ermitteln,
    db_list_traeger: db_list_traeger,
    db_list_kreis: db_list_kreis,
    db_letzten_einsatz_ermitteln: db_letzten_einsatz_ermitteln,
    db_get_response_gesamter_einsatz: db_get_response_gesamter_einsatz,
    db_update_response: db_update_response,
    db_client_save: db_client_save,
    db_wache_id_ermitteln: db_wache_id_ermitteln, 

    
    
    function db_wache_id_ermitteln(content, callback) {
    db.each('select waip_wachen_ID from waip_einsatzmittel where waip_einsaetze_ID = ? ' +
      'and waip_wachen_ID not null group by waip_wachen_ID', [content],
      function (err, row) {
        if (err == null && row) {
          callback && callback(row.waip_wachen_ID);
        } else {
          callback && callback(null);
        };
      });
  };


  function db_get_response_gesamter_einsatz(waip_einsaetze_id, callback) {
  db.all(`SELECT response_json FROM waip_response
    WHERE waip_einsaetze_id = ?`, [waip_einsaetze_id], function (err, rows) {
    if (err == null && rows) {
      callback && callback(rows);
    } else {
      callback && callback(null);
    };
  });
};


  function db_einsatz_laden(waip_id, wachen_id, callback) {
    db.get('SELECT e.id, e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT, ' +
      'e.ORTSTEIL, e.STRASSE, e.BESONDERHEITEN, e.wgs84_x, e.wgs84_y, em1.EM_ALARMIERT, em0.EM_WEITERE FROM WAIP_EINSAETZE e ' +
      'left join ' +
      '(SELECT waip_einsaetze_id, waip_wachen_id, group_concat(einsatzmittel) AS em_alarmiert FROM WAIP_EINSATZMITTEL WHERE waip_einsaetze_id = ? and waip_wachen_id = ? GROUP BY waip_wachen_id, waip_einsaetze_id) em1 ' +
      'ON em1.waip_einsaetze_id = e.ID ' +
      'LEFT JOIN ' +
      '(SELECT waip_einsaetze_id, group_concat(einsatzmittel) AS em_weitere FROM waip_einsatzmittel WHERE waip_einsaetze_id = ? and waip_wachen_id <> ? GROUP BY waip_einsaetze_id) em0 ' +
      'ON em0.waip_einsaetze_id = e.ID ' +
      'WHERE e.id LIKE ? ' +
      'ORDER BY e.id DESC LIMIT 1', [waip_id, wachen_id, waip_id, wachen_id, waip_id],
      function (err, row) {
        if (err == null && row) {
          callback && callback(row);
        } else {
          callback && callback(null);
        }
      });
  };

*/

//veraltet
/*function db_update_response(waip_id, i_ek, i_ma, i_fk, i_agt, callback) {
  db.run(`
    UPDATE waip_response SET
    einsatzkraft = einsatzkraft + \'` + i_ek + `\',
    maschinist = maschinist + \'` + i_ma + `\',
    fuehrungskraft = fuehrungskraft + \'` + i_fk + `\',
    atemschutz = atemschutz + \'` + i_agt + `\'
    WHERE waip_einsaetze_id like \'` + waip_id + `\'`, function(err) {
    if (err == null) {
      db.run(`
        INSERT OR IGNORE INTO waip_response
          (id, waip_einsaetze_id, einsatzkraft, maschinist, fuehrungskraft, atemschutz)
     	  VALUES (
          (select ID from waip_response where waip_einsaetze_id like \'` + waip_id + `\'),
       	  \'` + waip_id + `\',
          \'` + i_ek + `\',
          \'` + i_ma + `\',
          \'` + i_fk + `\',
          \'` + i_agt + `\');
        UPDATE waip_response`, function(err) {
        if (err == null) {
          db.get(`SELECT einsatzkraft EK, maschinist MA, fuehrungskraft FK, atemschutz AGT FROM waip_response
            WHERE waip_einsaetze_id = ?`, [waip_id], function(err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        } else {
          callback && callback(null);
        };
      });
    } else {
      callback && callback(null);
    };
  });
};*/

/*function db_client_save(client_id, client_ip, room_name) {
  db.run('INSERT OR REPLACE INTO waip_clients (' +
    'socket_id, client_ip, room_name) ' +
    'VALUES (\'' +
    client_id + '\', \'' +
    client_ip + '\', \'' +
    room_name + '\')');
};*/

/*function db_list_wachen(callback) {
    db.all('select nr_wache nr, name_wache name from waip_wachen order by name_wache', function (err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_list_traeger(callback) {
    db.all('select nr_kreis || nr_traeger nr, name_traeger name from waip_wachen group by name_traeger order by name_traeger', function (err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_list_kreis(callback) {
    db.all('select nr_kreis nr, name_kreis name from waip_wachen group by name_kreis order by name_kreis', function (err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };
  
    function db_letzten_einsatz_ermitteln(callback) {
    db.get('select id from waip_einsaetze order by id DESC LIMIT 1', function (err, row) {
      if (err == null && row) {
        callback && callback(row.id);
      } else {
        callback && callback(null);
      };
    });
  };
  
    function db_wache_nr_ermitteln(content, callback) {
    db.get('select nr_wache from waip_wachen where id = ? ', [content], function (err, row) {
      if (err == null && row) {
        callback && callback(row.nr_wache);
      } else {
        callback && callback(null);
      };
    });
  };

      db.run(`UPDATE waip_clients
      SET client_status=\'` + client_status + `\',
      client_ip=\'` + client_ip + `\',
      user_name=\'` + user_name + `\',
      user_permissions=\'` + user_permissions + `\',
      user_agent=\'` + user_agent + `\',
      reset_timestamp=(select DATETIME(zeitstempel,\'+\' || ` + reset_timestamp + ` || \' minutes\') from waip_einsaetze where id =\'` + client_status + `\')
      WHERE socket_id=\'` + socket_id + `\'`);
  
  
  */