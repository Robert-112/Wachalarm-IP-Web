module.exports = function (io, sql, app_cfg, remote_api, saver) {

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
        socket.disconnect(true);
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
          saver.save_new_waip(data, remote_ip, app_id);
          if (app_cfg.global.development) {
            sql.db_log('API', 'Neuer Wachalarm von ' + remote_ip + ': ' + JSON.stringify(data));
          } else {
            sql.db_log('API', 'Neuer Wachalarm von ' + remote_ip + '. Wird verarbeitet.');
          };          
        };
      });

      // neue externe Rueckmeldung speichern 
      socket.on('from_client_to_server_new_rmld', function (raw_data) {
        var data = raw_data.data;
        var app_id = raw_data.app_id;
        // nur speichern wenn app_id nicht eigenen globalen app_id entspricht
        if (app_id != app_cfg.global.app_id) {
          saver.save_new_rmld(data, remote_ip, app_id, function (result) {
            if (!result) {
              sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + remote_ip + ': ' + JSON.stringify(data));
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

  // ###
  // Client Socket.IO Sende-API (Daten an Server senden, zu denen eine Verbindung hergestellt wurde)
  // ###

  if (app_cfg.endpoint.enabled) {
    // Verbindung zu anderem Server aufbauen
    // TODO API: Verbindungsaufbau mit passendem Geheimnis absichern, IP-Adresse senden

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
        saver.save_new_waip(data, app_cfg.endpoint.host, app_id);        
        if (app_cfg.global.development) {
          sql.db_log('API', 'Neuer Wachalarm von ' + app_cfg.endpoint.host + ': ' + JSON.stringify(data));
        } else {
          sql.db_log('API', 'Neuer Wachalarm von ' + app_cfg.endpoint.host + '. Wird verarbeitet.');
        };  
      };
    });

    // neue Rückmeldung vom Endpoint-Server
    remote_api.on('from_server_to_client_new_rmld', function (raw_data) {
      var data = raw_data.data;
      var app_id = raw_data.app_id;
      // nur speichern wenn app_id nicht eigenen globalen app_id entspricht
      if (app_id != app_cfg.global.app_id) {
        saver.save_new_rmld(data, app_cfg.endpoint.host, app_id, function (result) {
          if (!result) {
            sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + app_cfg.endpoint.host + ': ' + JSON.stringify(data));
          };
        });
      };
    });
  };

};