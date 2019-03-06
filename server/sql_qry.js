module.exports = function(db) {

  function db_einsatz_vorhanden(content, callback) {
    // ermittelt den letzten vorhanden Einsatz zu einer Wache
    if (parseInt(content) == 0) {
      content = '%'
    };
    db.all('select em.waip_einsaetze_id from waip_einsatzmittel em ' +
      'left join waip_wachen wa on wa.id = em.waip_wachen_id  ' +
      'where wa.nr_wache like ?||\'%\' ' +
      'group by em.waip_einsaetze_id ORDER BY em.waip_einsaetze_id DESC', [content],
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
    db.serialize(function() {
      // Einsatzdaten speichern
      db.run(`INSERT OR REPLACE INTO waip_einsaetze (
        id, einsatznummer, alarmzeit, einsatzart, stichwort, sondersignal, besonderheiten, ort, ortsteil, strasse, objekt, objektnr, objektart, wachenfolge, wgs84_x, wgs84_y)
        VALUES (
        (select ID from waip_einsaetze where einsatznummer like \'` + content.einsatzdaten.nummer + `\'),
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
            for (var i = 0; i < content.alarmdaten.length; i++) {
              db.run(`INSERT OR REPLACE INTO waip_einsatzmittel (id, waip_einsaetze_ID, waip_wachen_ID, wachenname, einsatzmittel, zeitstempel)
                VALUES (
                (select ID from waip_einsatzmittel where einsatzmittel like \'` + content.alarmdaten[i].einsatzmittel + `\'),
                \'` + this.lastID + `\',
                (select id from waip_wachen where name_wache like \'` + content.alarmdaten[i].wachenname + `\'),
                \'` + content.alarmdaten[i].wachenname + `\',
                \'` + content.alarmdaten[i].einsatzmittel + `\',
                \'` + content.alarmdaten[i].zeit_a + `\')`);
            };
            // waip_id zurückgeben
            callback && callback(this.lastID);
          } else {
            callback && callback(err);
          };
        });
    });
  };

  function db_einsatz_laden(waip_id, wachen_id, callback) {
    db.get('SELECT e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT, ' +
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
          rows.push({
            "room": 0
          });
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

  function db_get_einsatzdaten(waip_id, wachen_nr, callback) {
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
        // je nach laenge andere SQL ausfuehren
        db.get('SELECT e.EINSATZART, e.STICHWORT, e.SONDERSIGNAL, e.OBJEKT, e.ORT,e.ORTSTEIL, e.STRASSE, e.BESONDERHEITEN, e.wgs84_x, e.wgs84_y, em1.EM_ALARMIERT, em0.EM_WEITERE ' +
          'FROM WAIP_EINSAETZE e ' +
          'LEFT JOIN (' +
          'SELECT waip_einsaetze_id, \'[\' || group_concat(\'{\"name\": \"\' || einsatzmittel || \'\", \"zeit\": \"\' || zeitstempel || \'\"}\') || \']\' AS em_alarmiert ' +
          'FROM WAIP_EINSATZMITTEL WHERE waip_einsaetze_id = ? and waip_wachen_id in ( ' +
          'select id from waip_wachen where nr_wache like ?||\'%\') ' +
          'GROUP BY waip_einsaetze_id ' +
          ') em1 ON em1.waip_einsaetze_id = e.ID ' +
          'LEFT JOIN (' +
          'SELECT waip_einsaetze_id, \'[\' || group_concat(\'{\"name\": \"\' || einsatzmittel || \'\", \"zeit\": \"\' || zeitstempel || \'\"}\') || \']\' AS em_weitere ' +
          'FROM waip_einsatzmittel WHERE waip_einsaetze_id = ? and waip_wachen_id not in ( ' +
          'select id from waip_wachen where nr_wache like ?||\'%\') ' +
          'GROUP BY waip_einsaetze_id ' +
          ') em0 ON em0.waip_einsaetze_id = e.ID ' +
          'WHERE e.id LIKE ? ' +
          'ORDER BY e.id DESC LIMIT 1', [waip_id, wachen_nr, waip_id, wachen_nr, waip_id],
          function(err, row) {
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

  function db_update_client_status(socket_id, client_status) {
    db.run('UPDATE waip_clients ' +
      'SET client_status=\'' + client_status + '\'' +
      'WHERE socket_id=\'' + socket_id + '\'');
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
    db.all(`select we.einsatzart, we.stichwort, we.ort, we.ortsteil,
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
    db_check_permission: db_check_permission
  };

};
