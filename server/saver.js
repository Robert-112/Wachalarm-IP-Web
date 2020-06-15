module.exports = function (app_cfg, sql, waip, api, uuidv4) {

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
          db.get('select uuid from waip_einsaetze where einsatznummer like ?', [content.einsatzdaten.nummer], function (err, row) {
            if (err == null && row) {
              // wenn ein Einsatz mit UUID schon vorhanden ist, dann diese setzten / ueberschreiben
              content.einsatzdaten.uuid = row.uuid;
            } else {
              // uuid erzeugen und zuweisen falls nicht bereits in JSON vorhanden
              if (!content.einsatzdaten.uuid) {
                content.einsatzdaten.uuid = uuidv4();
              };
            };
            // Einsatz in DB Speichern
            waip.waip_speichern(waip_data);
            sql.db_log('WAIP', 'Neuer Einsatz von ' + remote_addr + ': ' + waip_data);
            // Einsatzdaten per API weiterleiten (entweder zum Server oder zum verbunden Client)
            // TODO TEST: Api WAIP
            api.server_to_client_new_waip(waip_data, app_id);
            api.client_to_server_new_waip(waip_data, app_id);
          });
        } else {
          sql.db_log('Fehler-WAIP', 'Fehler: Einsatz von ' + remote_addr + ' nicht valide: ' + waip_data);
        };
      });
    } else {
      sql.db_log('Fehler-WAIP', 'Fehler: Einsatz von ' + remote_addr + ' Fehlerhaft: ' + waip_data);
    };
  };

  function save_new_rmld(data, app_id) {


    // TODO TEST: Api WAIP
    api.server_to_client_new_rmld(req.body, 'web');
    api.client_to_server_new_rmld(req.body, 'web');



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

  return {
    save_new_waip: save_new_waip,
    save_new_rmld: save_new_rmld
  };

};