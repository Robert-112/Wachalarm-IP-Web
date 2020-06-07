module.exports = function (io, sql, app_cfg, waip) {

  // Module laden
  const io_api = require('socket.io-client');

 

  // FIXME eventuellen Zirkel-Bezug abfangen

  // ###
  // Server Socket.IO Empfangs-API (anderer Server stellt Verbindung her und sendet Daten)
  // ###

  if (app_cfg.api.enabled) {
    
    // Namespace API festlegen
    var nsp_api = io.of('/api');
    
    nsp_api.on('connection', function (socket) {
      // versuche Remote-IP zu ermitteln
      var remote_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

      //TODO pruefen ob Verbindung mit passendem Geheimnis und aus IP-Bereich, das Ergebnis loggen

      // in Liste der Clients mit aufnehmen
      sql.db_client_update_status(socket, 'api');
      
      // Neuen Einsatz speichern
      socket.on('from_client_to_server_new_waip', function (data) {
        waip.einsatz_speichern(data);
        sql.db_log('API', 'Neuer Wachalarm von ' + remote_ip + ': ' + data);
      });
      
      // neue externe Rueckmeldung speichern 
      socket.on('from_client_to_server_new_rmld', function (data) {
        waip.rmld_speichern(data, remote_ip, function (result) {
          if (!result) {
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
  
  function server_to_client_new_waip(data) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
      nsp_api.emit('from_server_to_client_new_waip', data);
      sql.db_log('API', 'Einsatz an ' + app_cfg.endpoint.host + ' gesendet: ' + data);
    };
  };
  
  function server_to_client_new_rmld(data) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
      nsp_api.emit('from_server_to_client_new_rmld', data);
      sql.db_log('API', 'Rückmeldung an ' + app_cfg.endpoint.host + ' gesendet: ' + data);
    };
  }; 

  // ###
  // Client Socket.IO Sende-API (Daten an Server senden, zu denen eine Verbindung hergestellt wurde)
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
    remote_api.on('from_server_to_client_new_waip', function (data) {
      waip.einsatz_speichern(data);
      sql.db_log('API', 'Neuer Wachalarm von ' + app_cfg.endpoint.host + ': ' + data);
    });

    // neue Rückmeldung vom Endpoint-Server
    remote_api.on('from_server_to_client_new_rmld', function (data) {
      waip.rmld_speichern(data, app_cfg.endpoint.host, function (result) {
        if (!result) {
          sql.db_log('API', 'Fehler beim speichern der Rückmeldung von ' + app_cfg.endpoint.host + ': ' + data);
        };
      }); 
    });
  };

  function client_to_server_new_waip(data) {
    // Alarm an Remote-Server senden, falls funktion aktiviert
    if (app_cfg.endpoint.enabled) {
      remote_api.emit('from_client_to_server_new_waip', data);
      sql.db_log('API', 'Neuen Wachalarm an ' + app_cfg.endpoint.host + ' gesendet: ' + data);
    };
  };

  function client_to_server_new_rmld(data) {
    // Rückmeldung an Remote-Server senden, falls funktion aktiviert
    if (app_cfg.endpoint.enabled) {
      remote_api.emit('from_client_to_server_new_rmld', data);
      sql.db_log('API', 'Rückmeldung an ' + app_cfg.endpoint.host + ' gesendet: ' + data);
    };
  };

  return {
    server_to_client_new_waip: server_to_client_new_waip,
    server_to_client_new_rmld: server_to_client_new_rmld,
    client_to_server_new_waip: client_to_server_new_waip,
    client_to_server_new_rmld: client_to_server_new_rmld
  };

};