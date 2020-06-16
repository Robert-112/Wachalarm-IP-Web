module.exports = function (app_cfg, sql, waip, uuidv4, io, remote_api) {

  // Module laden
  const turf = require('@turf/turf');

  // Variablen festlegen
  var uuid_pattern = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');

  // Speichern eines neuen Einsatzes
  function save_new_waip(waip_data, remote_addr, app_id) {
    // ist JSON?
    if (isValidJSON(waip_data)) {
      // Daten als JSON parsen
      waip_data = JSON.parse(waip_data);
      // Daten validieren
      validate_waip(waip_data, function (valid) {
        if (valid) {
          // Polygon erzeugen und zuweisen falls nicht vorhanden
          if (!waip_data.ortsdaten.wgs84_area) {
            var wgs_x = parseFloat(waip_data.ortsdaten.wgs84_x);
            var wgs_y = parseFloat(waip_data.ortsdaten.wgs84_y);
            var point = turf.point([wgs_y, wgs_x]);
            var buffered = turf.buffer(point, 1, {
              steps: app_cfg.global.circumcircle,
              units: 'kilometers'
            });
            var bbox = turf.bbox(buffered);
            var new_point = turf.randomPoint(1, {
              bbox: bbox
            });
            var new_buffer = turf.buffer(new_point, 1, {
              steps: app_cfg.global.circumcircle,
              units: 'kilometers'
            })
            waip_data.ortsdaten.wgs84_area = JSON.stringify(new_buffer);
          };
          // pruefen, ob vielleicht schon ein Einsatz mit einer UUID gespeichert ist
          sql.db_einsatz_get_uuid_by_enr(waip_data.einsatzdaten.nummer, function (waip_uuid) {
            if (waip_uuid) {
              // wenn ein Einsatz mit UUID schon vorhanden ist, dann diese setzten / ueberschreiben
              waip_data.einsatzdaten.uuid = waip_uuid;
            } else {
              // uuid erzeugen und zuweisen falls nicht bereits in JSON vorhanden, oder falls keine korrekte uuid
              if (!waip_data.einsatzdaten.uuid || !uuid_pattern.test(waip_data.einsatzdaten.uuid)) {
                waip_data.einsatzdaten.uuid = uuidv4();
              };
            };
            // nicht erwuenschte Daten ggf. enfernen (Datenschutzoption)
            filter_api_data(waip_data, remote_addr, function (data_filtered) {
              // Einsatz in DB Speichern
              waip.waip_speichern(data_filtered);
              sql.db_log('WAIP', 'Neuer Einsatz von ' + remote_addr + ' wird jetzt verarbeitet: ' + JSON.stringify(data_filtered));
            });
            // Einsatzdaten per API weiterleiten (entweder zum Server oder zum verbunden Client)
            // TODO TEST: Api WAIP
            api_server_to_client_new_waip(waip_data, app_id);
            api_client_to_server_new_waip(waip_data, app_id);
          });
        } else {
          sql.db_log('WAIP', 'Fehler: Einsatz von ' + remote_addr + ' nicht valide: ' + JSON.stringify(waip_data));
        };
      });
    } else {
      sql.db_log('WAIP', 'Fehler: Einsatz von ' + remote_addr + ' Fehlerhaft: ' + JSON.stringify(waip_data));
    };
  };

  function save_new_rmld(data, remote_addr, app_id, callback) {
    validate_rmld(data, function (valid) {
      if (valid) {
        waip.rmld_speichern(data, function (result) {
          if (result) {
            sql.db_log('RMLD', 'Rückmeldung von ' + remote_addr + ' erhalten und gespeichert: ' + JSON.stringify(data));
            callback && callback(result);
          } else {
            sql.db_log('RMLD', 'Fehler beim speichern der Rückmeldung von ' + remote_addr + ': ' + JSON.stringify(data));
            callback && callback(result);
          };
        });
        // RMLD-Daten per API weiterleiten (entweder zum Server oder zum verbunden Client)
        // TODO TEST: Api WAIP
        api_server_to_client_new_rmld(req.body, app_id);
        api_client_to_server_new_rmld(req.body, app_id);
      } else {
        sql.db_log('RMLD', 'Fehler: Rückmeldung von ' + remote_addr + ' nicht valide: ' + JSON.stringify(waip_data));
      };
    });
  };

  // Funktion um zu pruefen, ob Nachricht im JSON-Format ist
  function isValidJSON(text) {
    try {
      JSON.parse(text);
      return true;
    } catch (error) {
      return false;
    }
  };

  function validate_waip(data, callback) {
    // TODO Validierung: Einsatzdaten auf Validität prüfen

    // Log
    if (app_cfg.global.development) {
      console.log('Validierung WAIP: ' + JSON.stringify(data));
    };

    callback && callback(true);
    // SQL-Log
  };

  function validate_rmld(data, callback) {
    // TODO Validierung: Rueckmeldung auf plausibilität

    // Log
    if (app_cfg.global.development) {
      console.log('Validierung RMLD: ' + JSON.stringify(data));
    };

    callback && callback(true);
    // SQL-Log
  };

  function api_server_to_client_new_waip(data, app_id) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
      // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
      if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
      };
      io.of('/api').emit('from_server_to_client_new_waip', {
        data: data,
        app_id: app_id
      });
      sql.db_log('API', 'Einsatz an Clients gesendet: ' + JSON.stringify(data));
    };
  };

  function api_server_to_client_new_rmld(data, app_id) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
      // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
      if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
      };
      io.of('/api').emit('from_server_to_client_new_rmld', {
        data: data,
        app_id: app_id
      });
      sql.db_log('API', 'Rückmeldung an Clients gesendet: ' + JSON.stringify(data));
    };
  };

  function api_client_to_server_new_waip(data, app_id) {
    // Alarm an Remote-Server senden, falls funktion aktiviert
    if (app_cfg.endpoint.enabled) {
      // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
      if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
      };
      remote_api.emit('from_client_to_server_new_waip', {
        data: data,
        app_id: app_id
      });
      sql.db_log('API', 'Neuen Wachalarm an ' + app_cfg.endpoint.host + ' gesendet: ' + JSON.stringify(data));
    };
  };

  function api_client_to_server_new_rmld(data, app_id) {
    // Rückmeldung an Remote-Server senden, falls funktion aktiviert
    if (app_cfg.endpoint.enabled) {
      // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
      if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
      };
      remote_api.emit('from_client_to_server_new_rmld', {
        data: data,
        app_id: app_id
      });
      sql.db_log('API', 'Rückmeldung an ' + app_cfg.endpoint.host + ' gesendet: ' + JSON.stringify(data));
    };
  };

  function filter_api_data(data, remote_ip, callback) {
    // unnoetige Zeichen aus socket_id entfernen, um diese als Dateinamen zu verwenden
    if (app_cfg.filter.enabled) {
      // Filter nur anwenden wenn Einsatzdaten von bestimmten IP-Adressen kommen
      if (app_cfg.filter.on_message_from.includes(remote_ip)) {
        var data_filtered = data;
        // Schleife definieren
        function loop_done(data_filtered) {
          callback && callback(data_filtered);
        };
        var itemsProcessed = 0;
        // nicht gewollte Daten entfernen
        app_cfg.filter.remove_data.forEach(function (item, index, array) {
          data_filtered.einsatzdaten[item] = '';
          data_filtered.ortsdaten[item] = '';
          // Schleife erhoehen
          itemsProcessed++;
          if (itemsProcessed === array.length) {
            // Schleife beenden
            loop_done(data_filtered);
          };
        });
      } else {
        callback && callback(data);
      };
    } else {
      callback && callback(data);
    };
  };

  return {
    save_new_waip: save_new_waip,
    save_new_rmld: save_new_rmld
  };

};