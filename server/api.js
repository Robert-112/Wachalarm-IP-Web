module.exports = function (io, sql, app_cfg, waip) {

  // Module laden
  const io_api = require('socket.io-client');

  // Variablen festlegen
  var uuid_pattern = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');

  // ###
  // Server Socket.IO Empfangs-API (anderer Server stellt Verbindung her und sendet Daten)
  // ###

  if (app_cfg.api.enabled) {

    // Namespace API festlegen
    var nsp_api = io.of('/api');

    nsp_api.on('connection', function (socket) {
      // versuche Remote-IP zu ermitteln
      var remote_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

      // Remote-Verbindung nur zulassen, wenn IP in Access-List, und Access-List ueberhaupt befuellt
      if (!app_cfg.api.access_list.includes(remote_ip) && app_cfg.api.access_list.length > 0) {
        socket.terminate();
        sql.db_log('API', 'Verbindung von ' + remote_ip + ' geschlossen, da nicht in Zugangsliste.');
      };

      //TODO API: Eingehende Verbindung nur mit passendem Geheimnis zulassen, das Ergebnis loggen

      // in Liste der Clients mit aufnehmen
      sql.db_client_update_status(socket, 'api');

      // Neuen Einsatz speichern
      socket.on('from_client_to_server_new_waip', function (raw_data) {
        var data = raw_data.data;
        var app_id = raw_data.app_id;
        // nur speichern wenn app_id nicht eigenen globalen app_id entspricht
        if (app_id != app_cfg.global.app_id) {
          // nicht erwuenschte Daten ggf. enfernen (Datenschutzoption)
          filter_api_data(data, remote_ip, function (data_filtered) {
            waip.waip_speichern(data_filtered, app_id);
            sql.db_log('API', 'Neuer Wachalarm von ' + remote_ip + ': ' + data_filtered);
          });
        };
      });

      // neue externe Rueckmeldung speichern 
      socket.on('from_client_to_server_new_rmld', function (raw_data) {
        var data = raw_data.data;
        var app_id = raw_data.app_id;
        // nur speichern wenn app_id nicht eigenen globalen app_id entspricht
        if (app_id != app_cfg.global.app_id) {
          waip.rmld_speichern(data, remote_ip, function (result) {
            if (!result) {
              sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + remote_ip + ': ' + data);
            };
          });
        };
      });

      // Disconnect
      socket.on('disconnect', function () {
        sql.db_log('API', 'Schnittstelle von ' + remote_ip + ' (' + socket.id + ') geschlossen.');
        sql.db_client_delete(socket);
      });
    });
  };

  function server_to_client_new_waip(data, app_id) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
      // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
      if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
      };
      nsp_api.emit('from_server_to_client_new_waip', {
        data: data,
        app_id: app_id
      });
      sql.db_log('API', 'Einsatz an ' + app_cfg.endpoint.host + ' gesendet: ' + JSON.stringify(data));
    };
  };

  function server_to_client_new_rmld(data, app_id) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
      // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
      if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
      };
      nsp_api.emit('from_server_to_client_new_rmld', {
        data: data,
        app_id: app_id
      });
      sql.db_log('API', 'Rückmeldung an ' + app_cfg.endpoint.host + ' gesendet: ' + JSON.stringify(data));
    };
  };

  // ###
  // Client Socket.IO Sende-API (Daten an Server senden, zu denen eine Verbindung hergestellt wurde)
  // ###

  if (app_cfg.endpoint.enabled) {
    // Verbindung zu anderem Server aufbauen
    // TODO API: Verbindungsaufbau mit passendem Geheimnis absichern, IP-Adresse senden
    var remote_api = io_api.connect(app_cfg.endpoint.host, {
      reconnect: true
    });

    // Verbindungsaufbau protokollieren
    remote_api.on('connect', function () {
      sql.db_log('API', 'Verbindung mit ' + app_cfg.endpoint.host + ' ergestellt');
    });

    // Fehler protokollieren
    remote_api.on('connect_error', function (err) {
      sql.db_log('API', 'Verbindung zu ' + app_cfg.endpoint.host + ' verloren, Fehler: ' + err);
    });

    // Verbindungsabbau protokollieren
    remote_api.on('disconnect', function (reason) {
      sql.db_log('API', 'Verbindung zu ' + app_cfg.endpoint.host + ' verloren, Fehler: ' + reason);
    });

    // neuer Einsatz vom Endpoint-Server
    remote_api.on('from_server_to_client_new_waip', function (raw_data) {
      var data = raw_data.data;
      var app_id = raw_data.app_id;
      // nur speichern wenn app_id nicht eigenen globalen app_id entspricht
      if (app_id != app_cfg.global.app_id) {
        // nicht erwuenschte Daten ggf. enfernen (Datenschutzoption)
        app_cfg.endpoint.host
        filter_api_data(data, app_cfg.endpoint.host, function (data_filtered) {
          waip.waip_speichern(data_filtered, app_id);
          sql.db_log('API', 'Neuer Wachalarm von ' + app_cfg.endpoint.host + ': ' + data_filtered);
        });
      };
    });

    // neue Rückmeldung vom Endpoint-Server
    remote_api.on('from_server_to_client_new_rmld', function (raw_data) {
      var data = raw_data.data;
      var app_id = raw_data.app_id;
      // nur speichern wenn app_id nicht eigenen globalen app_id entspricht
      if (app_id != app_cfg.global.app_id) {
        waip.rmld_speichern(data, app_cfg.endpoint.host, function (result) {
          if (!result) {
            sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + app_cfg.endpoint.host + ': ' + JSON.stringify(data));
          };
        });
      };
    });
  };

  function client_to_server_new_waip(data, app_id) {
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

  function client_to_server_new_rmld(data, app_id) {
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
    server_to_client_new_waip: server_to_client_new_waip,
    server_to_client_new_rmld: server_to_client_new_rmld,
    client_to_server_new_waip: client_to_server_new_waip,
    client_to_server_new_rmld: client_to_server_new_rmld
  };

};