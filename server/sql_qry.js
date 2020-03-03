module.exports = function(db, async, app_cfg) {

  // Module laden
  const uuidv4 = require('uuid/v4');

  // ermittelt den letzten vorhanden Einsatz zu einer Wache
  function db_einsatz_vorhanden(wachen_id, user_id, callback) {
    var select_reset_counter;
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
      reset_counter FROM waip_configs WHERE user_id = ` + user_id + `)`;
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
      WHERE DATETIME(zeitstempel,	\'+\' || ` + select_reset_counter + ` || \' minutes\')
      	> DATETIME(\'now\')`, [wachen_id],
      function(err, rows) {
        if (err == null && rows.length > 0) {
          //callback && callback(row.waip_einsaetze_ID); ALT
          callback && callback(rows);
        } else {
          callback && callback(null);
        };
      });
  };

  function db_einsatz_speichern(content, callback) {
    // uuid erzeugen und zuweisen falls nicht vorhanden
    if (!content.einsatzdaten.uuid) {
      content.einsatzdaten.uuid = uuidv4();
    };
    db.serialize(function() {
      // Einsatzdaten speichern
      db.run(`INSERT OR REPLACE INTO waip_einsaetze (
        id, uuid, einsatznummer, alarmzeit, einsatzart, stichwort, sondersignal, besonderheiten, ort, ortsteil, strasse, objekt, objektnr, objektart, wachenfolge, wgs84_x, wgs84_y)
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
        \'` + content.ortsdaten.wgs84_y + `\')`,
        function(err) {
          if (err == null) {
            // Einsatzmittel zum Einsatz speichern
            var id = this.lastID;

            function loop_done(waip_id) {
              callback && callback(waip_id);
              //console.log('all done');
            };

            var itemsProcessed = 0;
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
                    itemsProcessed++;

                    if (itemsProcessed === array.length) {
                      loop_done(id);
                    };
                  } else {
                    callback && callback(err);
                  };
                });
            });
            /*async.concat(content.alarmdaten, function(item, done) {
              db.run(`INSERT OR REPLACE INTO waip_einsatzmittel (id, waip_einsaetze_ID, waip_wachen_ID, wachenname, einsatzmittel, zeitstempel)
                VALUES (
                (select ID from waip_einsatzmittel where einsatzmittel like \'` + item.einsatzmittel + `\'),
                \'` + id + `\',
                (select id from waip_wachen where name_wache like \'` + item.wachenname + `\'),
                \'` + item.wachenname + `\',
                \'` + item.einsatzmittel + `\',
                \'` + item.zeit_a + `\')`);
              done();
            }, function(err_) {
              if (err_) {
                console.error(err_.message);
              } else {
                callback && callback(id);
              }
            });*/
          } else {
            callback && callback(err);
          };
        });
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
      function(err, row) {
        if (err == null && row) {
          callback && callback(row);
        } else {
          callback && callback(null);
        }
      });
  };

  function db_wache_vorhanden(content, callback) {
    // wenn content keine Nummer ist, abbrechen
    if (isNaN(content)) {
      // Fehler: Wachennummer nicht korrekt.
      callback && callback(null);
    } else {
      var len = content.toString().length
      // content muss 2, 4 oder 6 Zeichen lang sein
      if (parseInt(content) != 0 && len != 2 && len != 4 && len != 6) {
        // Fehler: Wachennummer nicht plausibel.
        callback && callback(null);
      } else {
        // je nach laenge andere SQL ausfuehren
        if (parseInt(content) == 0) {
          db.get('select \'1\' length, nr_wache nr, name_wache name from waip_wachen where nr_wache like ?', [content], function(err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
        if (len == 2) {
          db.get('select \'2\' length, nr_kreis nr, name_kreis name from waip_wachen where nr_kreis like SUBSTR(?,-2, 2) group by name_kreis LIMIT 1', [content], function(err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
        if (len == 4) {
          db.get('select \'4\' length, nr_kreis || nr_traeger nr, name_traeger name from waip_wachen where nr_kreis like SUBSTR(?,-4, 2) and nr_traeger like SUBSTR(?,-2, 2) group by name_traeger LIMIT 1', [content, content], function(err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            };
          });
        };
        if (len == 6) {
          db.get('select \'6\' length, nr_wache nr, name_wache name from waip_wachen where nr_wache like ?', [content], function(err, row) {
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

  function db_wache_id_ermitteln(content, callback) {
    db.each('select waip_wachen_ID from waip_einsatzmittel where waip_einsaetze_ID = ? ' +
      'and waip_wachen_ID not null group by waip_wachen_ID', [content],
      function(err, row) {
        if (err == null && row) {
          callback && callback(row.waip_wachen_ID);
        } else {
          callback && callback(null);
        };
      });
  };

  function db_get_einsatzwachen(waip_id, callback) {
    db.all(`select w.nr_kreis room from waip_wachen w
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
      function(err, rows) {
        if (err == null && rows.length > 0) {
          // falls einsätze vorhanden, auch die null hinzufuegen
          //rows.push({
            //"room": 0
          //});
          callback && callback(rows);
        } else {
          callback && callback(null);
        };
      });
  };

  function db_wache_nr_ermitteln(content, callback) {
    db.get('select nr_wache from waip_wachen where id = ? ', [content], function(err, row) {
      if (err == null && row) {
        callback && callback(row.nr_wache);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_letzten_einsatz_ermitteln(callback) {
    db.get('select id from waip_einsaetze order by id DESC LIMIT 1', function(err, row) {
      if (err == null && row) {
        callback && callback(row.id);
      } else {
        callback && callback(null);
      };
    });
  };

  // alte Inhalte loeschen / aufräumen alle 15 Minuten
  function db_get_alte_einsaetze(minuten, callback) {
    db.each('SELECT id FROM waip_einsaetze WHERE zeitstempel <= datetime(\'now\',\'-' + minuten + ' minutes\')', function(err, row) {
      if (err == null && row) {
        callback && callback(row.id);
      } else {
        callback && callback(null);
      };
    });
  };

  // alte Inhalte loeschen
  function db_einsatz_loeschen(id) {
    db.run(`DELETE FROM waip_einsaetze WHERE id = ?`, [id]);
  };

  function db_list_wachen(callback) {
    db.all('select nr_wache nr, name_wache name from waip_wachen order by name_wache', function(err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_list_traeger(callback) {
    db.all('select nr_kreis || nr_traeger nr, name_traeger name from waip_wachen group by name_traeger order by name_traeger', function(err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_list_kreis(callback) {
    db.all('select nr_kreis nr, name_kreis name from waip_wachen group by name_kreis order by name_kreis', function(err, rows) {
      if (err == null && rows.length > 0) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_get_einsatzdaten(waip_id, wachen_nr, user_id, callback) {
    // vorsichtshalber nochmals id pruefen
    if (isNaN(waip_id) || isNaN(wachen_nr)) {
      callback && callback(null);
    } else {
      var len = wachen_nr.toString().length
      // wachen_nr muss 2, 4 oder 6 Zeichen lang sein
      if (parseInt(wachen_nr) != 0 && len != 2 && len != 4 && len != 6 && len == null) {
        callback && callback(null);
      } else {
        if (parseInt(wachen_nr) == 0) {
          wachen_nr = '%'
        };
        if (isNaN(user_id)) {
          user_id = app_cfg.global.default_time_for_standby;
        };
        // je nach laenge andere SQL ausfuehren
        db.get(`SELECT
          e.id,
          DATETIME(e.zeitstempel, 'localtime') zeitstempel,
        	DATETIME(e.zeitstempel,	'+' || (
            SELECT COALESCE(MAX(reset_counter), ?) reset_counter FROM waip_configs WHERE user_id = ?
            ) || ' minutes', 'localtime') ablaufzeit,
          e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT,e.ORTSTEIL, e.STRASSE,
          e.BESONDERHEITEN, e.wgs84_x, e.wgs84_y, em1.EM_ALARMIERT, em0.EM_WEITERE
          FROM WAIP_EINSAETZE e
          LEFT JOIN (
            SELECT waip_einsaetze_id, \'[\' || group_concat(\'{\"name\": \"\' || einsatzmittel || \'\", \"zeit\": \"\' || zeitstempel || \'\"}\') || \']\' AS em_alarmiert
            FROM WAIP_EINSATZMITTEL WHERE waip_einsaetze_id = ? and waip_wachen_id in (
              select id from waip_wachen where nr_wache like ?||\'%\')
              GROUP BY waip_einsaetze_id
            ) em1 ON em1.waip_einsaetze_id = e.ID
          LEFT JOIN (
            SELECT waip_einsaetze_id, \'[\' || group_concat(\'{\"name\": \"\' || einsatzmittel || \'\", \"zeit\": \"\' || zeitstempel || \'\"}\') || \']\' AS em_weitere
            FROM waip_einsatzmittel WHERE waip_einsaetze_id = ? and waip_wachen_id not in (
              select id from waip_wachen where nr_wache like ?||\'%\')
              GROUP BY waip_einsaetze_id
            ) em0 ON em0.waip_einsaetze_id = e.ID
          WHERE e.id LIKE ?
          ORDER BY e.id DESC LIMIT 1`,
          [app_cfg.global.default_time_for_standby, user_id, waip_id, wachen_nr, waip_id, wachen_nr, waip_id], function(err, row) {
            if (err == null && row) {
              callback && callback(row);
            } else {
              callback && callback(null);
            }
          });
      };
    };
  };

  function db_client_save(client_id, client_ip, room_name) {
    db.run('INSERT OR REPLACE INTO waip_clients (' +
      'socket_id, client_ip, room_name) ' +
      'VALUES (\'' +
      client_id + '\', \'' +
      client_ip + '\', \'' +
      room_name + '\')');
  };

  function db_client_delete(client_id) {
    db.run('DELETE FROM waip_clients ' +
      'WHERE socket_id = ?', client_id);
  };

  // Funkrufname
  function db_tts_einsatzmittel(einsatzmittel, callback) {
    //{"name": "FL CB 16/23-01", "zeit": "17:16"},{"name": "FL CB 16/11-01", "zeit": "17:16"},{"name": "FL CB 16/11-01", "zeit": "17:16"},{"name": "FL CB 16/11-01", "zeit": "17:16"},{"name": "FL CB 16/11-01", "zeit": "17:16"},{"name": "FL CB 16/11-01", "zeit": "17:16"},{"name": "FL CB 16/11-01", "zeit": "17:16"}
    var tmp = einsatzmittel.name.match(/(\d\d\-\d\d)/g);
    if (tmp) {
      var typ = tmp.toString().substring(0, 2);
      var nr = tmp.toString().slice(4);
      nr = nr.toString().replace(/^0+/, '');
      db.get('SELECT einsatzmittel_rufname name FROM waip_ttsreplace WHERE einsatzmittel_typ = ?', [typ], function(err, row) {
        if (err == null && row) {
          callback(null, row.name + ' ' + nr);
        } else {
          callback(null, einsatzmittel.name); // + err + typ + nr + '_ ' + tmp);
        };
      });
    } else {
      callback(null, einsatzmittel.name);
    };
  };

  function db_get_socket_by_id(content, callback) {
    db.get('select * from waip_clients where socket_id = ? ', [content], function(err, row) {
      if (err == null && row) {
        callback && callback(row);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_update_client_status(socket, client_status) {
    //console.log(socket);
    var socket_id = socket.id;
    var user_name = socket.request.user.user;
    var user_permissions = socket.request.user.permissions;
    var user_agent = socket.request.headers['user-agent'];
    var client_ip = socket.request.connection.remoteAddress;
    var reset_timestamp = socket.request.user.reset_counter;
    if (isNaN(client_status) || client_status == null) {
      client_status = 'Standby';
    };
    if (typeof user_name === "undefined") {
      user_name = '';
    };
    if (typeof user_permissions === "undefined") {
      user_permissions = '';
    };
    if ((typeof reset_timestamp === "undefined") || (reset_timestamp == null)) {
      reset_timestamp = app_cfg.global.default_time_for_standby;
    };
    db.run(`UPDATE waip_clients
      SET client_status=\'` + client_status + `\',
      client_ip=\'` + client_ip + `\',
      user_name=\'` + user_name + `\',
      user_permissions=\'` + user_permissions + `\',
      user_agent=\'` + user_agent + `\',
      reset_timestamp=(select DATETIME(zeitstempel,\'+\' || ` + reset_timestamp + ` || \' minutes\') from waip_einsaetze where id =\'` + client_status + `\')
      WHERE socket_id=\'` + socket_id + `\'`);
  };

  function db_check_client_waipid(socketId, waip_id, callback) {
    db.get('SELECT client_status id from waip_clients where socket_id like ?', [socketId], function(err, row) {
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
    db.run(`INSERT INTO waip_log (log_typ, log_text)
      VALUES (
        \'` + typ + `\',
        \'` + text + `\')`);
    //TODO: Log auf 20.000 Datensätze begrenzen
  };

  function db_get_log(callback) {
    db.all(`select * from waip_log order by id desc LIMIT 5000`, function(err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_get_active_clients(callback) {
    db.all(`select * from waip_clients`, function(err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_get_active_waips(callback) {
    db.all(`select we.uuid, we.einsatzart, we.stichwort, we.ort, we.ortsteil,
    GROUP_concat(DISTINCT substr( wa.nr_wache, 0, 3 )) a,
    GROUP_concat(DISTINCT substr( wa.nr_wache, 0, 5 )) b,
    GROUP_concat(DISTINCT wa.nr_wache) c
    from waip_einsaetze we
    left join waip_einsatzmittel em on em.waip_einsaetze_ID = we.id
    left join waip_wachen wa on wa.id = em.waip_wachen_ID
    GROUP by we.id
    ORDER by we.einsatzart, we.stichwort`, function(err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_get_users(callback) {
    db.all('SELECT id, user, permissions, ip_address FROM waip_users', function(err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_check_permission(permissions, waip_id, callback) {
    if (permissions === undefined) {
      callback && callback(false);
    } else {
      if (permissions == 'admin') {
        callback && callback(true);
      } else {
        //permissions -> 52,62,6690,....
        db.get(`select group_concat(DISTINCT wa.nr_wache) wache from waip_einsatzmittel em
          left join waip_wachen wa on wa.id = em.waip_wachen_ID
          where waip_einsaetze_ID = ?`, [waip_id], function(err, row) {
          if (err == null && row) {
            var permission_arr = permissions.split(",");
            var wachen_arr = row.wache.split(",");
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
    };
  };

  function db_get_userconfig(user_id, callback) {
    db.get(`SELECT reset_counter FROM waip_configs
      WHERE user_id = ?`, [user_id], function(err, row) {
      if (err == null && row) {
        callback && callback(row.reset_counter);
      } else {
        callback && callback(null);
      };
    });
  };

  function db_set_userconfig(user_id, reset_counter, callback) {
    // reset_counter validieren, ansonsten default setzen
    if (!(reset_counter >= 1 && reset_counter <= app_cfg.global.time_to_delete_waip)) {
      reset_counter = app_cfg.global.default_time_for_standby;
    };
    db.run((`INSERT OR REPLACE INTO waip_configs
      (id, user_id, reset_counter)
      VALUES (
      (select ID from waip_configs where user_id like \'` + user_id + `\'),
      \'` + user_id + `\',
      \'` + reset_counter + `\')`), function(err) {
      if (err == null) {
        callback && callback();
      } else {
        callback && callback(null);
      };
    });
  };

  function db_get_sockets_to_standby(callback) {
    db.all(`select socket_id from waip_clients
      where reset_timestamp < DATETIME(\'now\')`, function(err, rows) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };

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

  function db_save_response(responseobj, callback) {


    // Rueckmeldung aufarbeiten
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
    // Wache zuordnen
    if (!isNaN(responseobj.wachenauswahl)) {
      reuckmeldung.wache_id = responseobj.wachenauswahl;
    } else {
      reuckmeldung.wache_id = null;
    };
    //console.log(JSON.stringify(reuckmeldung));

    db.get(`select name_wache, nr_wache from waip_wachen where id = ?;`, [reuckmeldung.wache_id], function(err, row) {
      if (err == null && row) {
        reuckmeldung.wache_name = row.name_wache;
        reuckmeldung.wache_nr = row.nr_wache;

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
        \'` + reuckmeldung.wache_name + `\')`), function(err) {
          //console.log(err);
        if (err == null) {
          callback && callback('OK');
        } else {
          callback && callback(null);
        };
      });


      } else {
        callback && callback(null);
      };
    });


    
  };

  function db_get_response_gesamter_einsatz(waip_einsaetze_id, callback){
    db.all(`SELECT response_json FROM waip_response
      WHERE waip_einsaetze_id = ?`, [waip_einsaetze_id], function(err, row) {
      if (err == null && rows) {
        callback && callback(rows);
      } else {
        callback && callback(null);
      };
    });
  };
  
  function db_get_response_wache(waip_einsaetze_id, wachen_nr, callback) {
    db.all(`SELECT * FROM waip_response WHERE waip_uuid = (select uuid from waip_einsaetze where id = ?)`, [waip_einsaetze_id], function (err, rows) {
      if (err == null && rows) {
        
        // temporaere Variablen
        var itemsProcessed = 0;
        var all_responses = [];
        // callback-function fuer absgeschlossene Schleife
        function loop_done(all_responses) {
          callback && callback(all_responses);
        };
        // Zeilen einzelnen durchgehen
        console.log('rows: '+JSON.stringify(rows));
        rows.forEach(function (item, index, array) {
          // summiertes JSON-Rueckmeldeobjekt für die angeforderte Wachennummer erstellen
          var tmp = JSON.stringify(item.wache_nr);
        console.log('item. '+tmp );
        console.log(wachen_nr);
        console.log(tmp.startsWith(wachen_nr));
          
              if (tmp.startsWith(wachen_nr)) {
                // response_wache aufsummieren
                all_responses.push(item)
              };


    
          // Schleife ggf. beenden
          itemsProcessed++;
          if (itemsProcessed === array.length) {
            console.log('get_response_wache: '+JSON.stringify(all_responses));
            loop_done(all_responses);
          };
        });
      } else {
        callback && callback(null);
      };
    });
  };

  function db_get_einsatzdaten_by_uuid(waip_uuid, callback){
    db.get(`SELECT e.id, e.uuid, e.ZEITSTEMPEL, e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT, 
      e.ORTSTEIL, e.STRASSE, e.BESONDERHEITEN, e.wgs84_x, e.wgs84_y, e.wgs84_area FROM WAIP_EINSAETZE e 
      WHERE e.uuid like ?`, [waip_uuid], function(err, row) {
      if (err == null && row) {
        console.log(row.uuid);
        console.log(row.id);
        db.all(`SELECT e.einsatzmittel, e.status FROM waip_einsatzmittel e 
          WHERE e.waip_einsaetze_id = ?`, [row.id], function(err, rows) {
          if (err == null && rows) {
            var einsatzdaten = row;
            einsatzdaten.einsatzmittel = rows; 
            db.all(`SELECT DISTINCT e.waip_wachen_ID, e.wachenname FROM waip_einsatzmittel e 
              WHERE e.waip_einsaetze_id = ?`, [row.id], function(err, wachen) {
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

  function db_get_waipid_by_uuid(waip_uuid, callback){
    db.get(`SELECT id FROM WAIP_EINSAETZE WHERE e.uuid like ?`, [waip_uuid], function(err, row) {
      if (err == null && row) {
        callback && callback(row.id);
      } else {
        callback && callback(null);
      };
    });
  };

  return {
    db_einsatz_speichern: db_einsatz_speichern,
    db_einsatz_laden: db_einsatz_laden,
    db_einsatz_vorhanden: db_einsatz_vorhanden,
    db_wache_vorhanden: db_wache_vorhanden,
    db_wache_id_ermitteln: db_wache_id_ermitteln,
    db_wache_nr_ermitteln: db_wache_nr_ermitteln,
    db_get_einsatzdaten: db_get_einsatzdaten,
    db_get_einsatzwachen: db_get_einsatzwachen,
    db_list_wachen: db_list_wachen,
    db_list_traeger: db_list_traeger,
    db_list_kreis: db_list_kreis,
    db_letzten_einsatz_ermitteln: db_letzten_einsatz_ermitteln,
    db_einsatz_loeschen: db_einsatz_loeschen,
    db_get_alte_einsaetze: db_get_alte_einsaetze,
    db_client_save: db_client_save,
    db_client_delete: db_client_delete,
    db_tts_einsatzmittel: db_tts_einsatzmittel,
    db_get_socket_by_id: db_get_socket_by_id,
    db_update_client_status: db_update_client_status,
    db_check_client_waipid: db_check_client_waipid,
    db_log: db_log,
    db_get_log: db_get_log,
    db_get_active_clients: db_get_active_clients,
    db_get_active_waips: db_get_active_waips,
    db_get_users: db_get_users,
    db_check_permission: db_check_permission,
    db_get_userconfig: db_get_userconfig,
    db_set_userconfig: db_set_userconfig,
    db_get_sockets_to_standby: db_get_sockets_to_standby,
    //db_update_response: db_update_response,
    db_save_response: db_save_response,
    db_get_response_gesamter_einsatz: db_get_response_gesamter_einsatz,
    db_get_response_wache: db_get_response_wache,
    db_get_einsatzdaten_by_uuid: db_get_einsatzdaten_by_uuid,
    db_get_waipid_by_uuid:db_get_waipid_by_uuid
  };

};
