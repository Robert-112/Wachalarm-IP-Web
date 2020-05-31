module.exports = function (io, sql, app_cfg, waip) {

  // Module laden
  const io_api = require('socket.io-client');

  // Namespace API festlegen
  var nsp_api = io.of('/api');

  // TODO eventuellen Zirkel-Bezug abfangen

  // ###
  // Socket.IO Empfangs-API (anderer Server stellt Verbindung her und sendet Daten)
  // ###

  if (app_cfg.api.enabled) {
    nsp_api.on('connection', function (socket) {
      // versuche Remote-IP zu ermitteln
      var remote_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

      //TODO pruefen ob Verbindung mit passendem Geheimnis und aus IP-Bereich, das Ergebnis loggen

      // in Liste der Clients mit aufnehmen
      sql.db_client_update_status(socket, 'api');
      // Neuen Einsatz speichern
      socket.on('emit_new_waip', function (data) {
        waip.einsatz_speichern(data);
        sql.db_log('API', 'Neuer Einsatz von ' + remote_ip + ': ' + data);
      });
      // neue externe Rueckmeldung speichern 
      socket.on('emit_new_rmld', function (data) {
        sql.db_rmld_save(data, function (result) {
          if (result) {
            waip.rmld_verteilen_by_uuid(data.waip_uuid, data.rmld_uuid);
            sql.db_log('API', 'Rückmeldung von ' + remote_ip + ' gespeichert: ' + result);
          } else {
            sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + remote_ip + ': ' + data);
          };
        });
      });
      // Disconnect
      socket.on('disconnect', function () {
        sql.db_log('API', 'Schnittstelle von ' + remote_ip + ' (' + socket.id + ') geschlossen.');
        sql.db_client_delete(socket);
      });
    });
  };

  // ###
  // Socket.IO Sende-API (Daten an Server senden, die Verbindung hergestellt haben)
  // ###

  if (app_cfg.endpoint.enabled) {
    // Verbindung zu anderem Server aufbauen
    // TODO Verbindungsaufbau mit passendem Geheimnis absichern
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
    remote_api.on('res_new_waip', function (data) {
      waip.einsatz_speichern(data);
      sql.db_log('API', 'Neuer Einsatz von ' + app_cfg.endpoint.host + ': ' + data);
    });

    // neue Rückmeldung vom Endpoint-Server
    remote_api.on('res_new_rmld', function (data) {
      sql.db_rmld_save(data, function (result) {
        if (result) {
          waip.rmld_verteilen_by_uuid(data.waip_uuid, data.rmld_uuid);
          sql.db_log('API', 'Rückmeldung von ' + app_cfg.endpoint.host + ' gespeichert: ' + result);
        } else {
          sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + app_cfg.endpoint.host + ': ' + data);
        };
      });
    });
  };

  function endpoint_emit_new_waip(data) {
    // Alarm an Remote-Server senden, falls funktion aktiviert
    if (app_cfg.endpoint.enabled) {
      remote_api.emit('emit_new_waip', data);
      sql.db_log('API', 'Neuen Wachalarm an ' + app_cfg.endpoint.host + ' gesendet: ' + data);
    };
  };

  function endpoint_emit_new_rmld(data) {
    // Rückmeldung an Remote-Server senden, falls funktion aktiviert
    if (app_cfg.endpoint.enabled) {
      remote_api.emit('emit_new_rmld', data);
      sql.db_log('API', 'Rückmeldung an ' + app_cfg.endpoint.host + ' gesendet: ' + data);
    };
  };

  return {
    send_new_waip: send_new_waip,
    send_new_rmld: send_new_rmld
  };

};