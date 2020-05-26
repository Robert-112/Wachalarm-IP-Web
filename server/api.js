module.exports = function (io, sql, app_cfg, waip) {

  // Module laden
  const io_api = require('socket.io-client');

  // Namespace API festlegen
  var nsp_api = io.of('/api');

  // Socket.IO Empfangs-API (anderer Server stellt Verbindung her und sendet Daten)

  if (app_cfg.api.enabled) {    
    nsp_api.on('connection', function (socket) {
      // versuche Remote-IP zu ermitteln
      var remote_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;


// TODO Connect loggen

      //TODO pruefen ob Verbindung mit passendem Geheimnis und aus IP-Bereich

      // in Liste der Clients mit aufnehmen
      sql.db_update_client_status(socket, 'api');
      // Neuen Einsatz speichern
      socket.on('new_waip', function (data) {
        waip.einsatz_speichern(data);
        sql.db_log('API', 'Neuer Einsatz von ' + remote_ip + ': ' + data);        
      });
      // neue externe Rueckmeldung speichern 
      socket.on('new_rmld', function (data) {
        sql.db_save_rmld(data, function (result) {
          if (result) {
            waip.rmld_verteilen_by_uuid(data.waip_uuid, data.rmld_uuid);
            sql.db_log('API', 'Rückmeldung von ' + remote_ip + ' gespeichert: ' + data);
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

  // Socket.IO Sende-API (Daten an Server senden, die Verbindung hergestellt haben)

  if (app_cfg.endpoint.enabled) {
    var remote_api = io_api.connect(app_cfg.endpoint.host, {
        reconnect: true
    });

    // Add a connect listener
    remote_api.on('connect', function () {
        console.log('Connected!');
    });

    remote_api.on('connect_error', function (err) {
        console.log('Fehler! ' + err);
    });


    // Funktio daraus machen
    remote_api.emit('new_waip', data);

    //send_mission_type: ['Brandeinsatz', 'Hilfeleistung'],
	//send_data_type: ['uuid', 'n
            // data so wie bei udp
    remote_api.emit('new_rmld', data);
            // gibts nur im routing

} else {
    const remote_api;
};



  return {
    send_new_waip: send_new_waip,
    send_new_rmld: send_new_rmld
  };

};