module.exports = function (io, io_api, sql, app_cfg, waip) {

  // Module laden
  const io_api = require('socket.io-client');

  // Socket.IO API (anderer Server stellt Verbindung her und sendet Daten)

  if (app_cfg.api.enabled) {
    // Namespace API
    var nsp_api = io.of('/api');
    nsp_api.on('connection', function (socket) {
      // versuche Remote-IP zu ermitteln
      var remote_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

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



    // Endpoint-API
    if (app_cfg.endpoint.enabled) {
        const remote_api = io_api.connect(app_cfg.global.remoteapi, {
            reconnect: true
        });
    } else {
        const remote_api;
    };



    // Module laden
    //client.js



    // Add a connect listener
    remote_api.on('connect', function (remote_api) {
        console.log('Connected!');
    });

    socket.on('connect_error', function (err) {
        $('#waipModalTitle').html('FEHLER');
        $('#waipModalBody').html('Verbindung zum Server getrennt!');
        $('#waipModal').modal('show');
    });

    remote_api.emit('CH01', 'me', 'test msg');



    // Funktion um zu pruefen, ob Nachricht im JSON-Format ist
    function isValidJSON(text) {
        try {
            JSON.parse(text);
            return true;
        } catch (error) {
            return false;
        }
    };

    //client.js



    // Add a connect listener
    remote_api.on('connect', function (remote_api) {
        console.log('Connected!');
    });

    socket.on('connect_error', function (err) {
        $('#waipModalTitle').html('FEHLER');
        $('#waipModalBody').html('Verbindung zum Server getrennt!');
        $('#waipModal').modal('show');
    });

    remote_api.emit('CH01', 'me', 'test msg');

    return {
        einsatz_speichern: einsatz_speichern,
        waip_verteilen: waip_verteilen,
        dbrd_verteilen: dbrd_verteilen,
        rmld_verteilen_for_one_client: rmld_verteilen_for_one_client,
        rmld_verteilen_by_uuid: rmld_verteilen_by_uuid
    };




};