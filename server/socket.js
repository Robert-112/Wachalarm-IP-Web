module.exports = function (io, sql, app_cfg, waip) {

  // Module laden
  //client.js
  var io_api = require('socket.io-client');
  var socket_api = io_api.connect(app_cfg.global.remoteapi, {
    reconnect: true
  });

  // Add a connect listener
  socket_api.on('connect', function (socket_api) {
    console.log('Connected!');
  });
  socket_api.emit('CH01', 'me', 'test msg');

  // Socket.IO Server

  var nsp_waip = io.of('/waip');

  nsp_waip.on('connection', function (socket) {
    var client_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    //zuerst Server-Version senden, damit der Client diese prueft und die Seite ggf. neu lädt
          //io.sockets.to(socket.id).emit('io.version', app_cfg.global.app_id);
    socket.emit('io.version', app_cfg.global.app_id);
    // Aufruf des Alarmmonitors einer bestimmten Wache verarbeiten
    socket.on('WAIP', function (wachen_id) {
      
      sql.db_log('WAIP', 'Alarmmonitor Nr. ' + wachen_id + ' von ' + client_ip + ' (' + socket.id + ') aufgerufen');
      // prüfen ob Wachenummer in der Datenbank hinterlegt ist
      sql.db_wache_vorhanden(wachen_id, function (result) {
        // wenn die Wachennummer vorhanden/plausibel dann weiter
        if (result) {
          // Socket-Room beitreiten
          socket.join(wachen_id, function () {
            // Socket-ID und Client-IP in der Datenbank speichern
            //sql.db_client_save(socket.id, client_ip, wachen_id);
            //sql.db_update_client_status(socket, null);
            // prüfen ob für diese Wache Einsätze vorhanden sind
            sql.db_einsatz_ermitteln(wachen_id, socket.request.user.id, function (result_einsatz) {
              if (result_einsatz) {
                // nur den ersten Einsatz senden, falls mehrere vorhanden sind
                var waip_id = result_einsatz[0].waip_einsaetze_ID;
                sql.db_log('WAIP', 'Einsatz ' + waip_id + ' für Wache ' + wachen_id + ' vorhanden, wird jetzt an Client gesendet.');
                //letzten Einsatz verteilen
                        //                                                  zuvor: socket.id
                waip.einsatz_verteilen(waip_id, socket, wachen_id);
                //vorhanden Rückmeldungen verteilen
                      //                                                  zuvor: socket.id
                waip.rueckmeldung_verteilen_for_client(waip_id, socket, wachen_id);
                // in Statusüberischt speichern
                sql.db_update_client_status(socket, waip_id);
              } else {
                sql.db_log('WAIP', 'Kein Einsatz für Wache ' + wachen_id + ' vorhanden, gehe in Standby');
                // falls kein Einsatz vorhanden ist, dann Standby senden
                //io.sockets.to(socket.id).emit('io.standby', null);
                socket.emit('io.standby', null);
                // in Statusüberischt speichern
                sql.db_update_client_status(socket, null);
              };
            });
          });
        } else {
          sql.db_log('Fehler-WAIP', 'Fehler: Wachnnummer ' + wachen_id + 'nicht vorhanden');
          // io.sockets.to(socket.id).emit('io.error', 'Fehler: Wachnnummer \'' + wachen_id + '\' nicht vorhanden!');
          socket.emit('io.error', 'Fehler: Wachnnummer \'' + wachen_id + '\' nicht vorhanden!');
        };
      });
    });
    // disconnect verarbeiten
    socket.on('disconnect', function () {
      sql.db_log('WAIP', 'Alarmmonitor von ' + client_ip + ' (' + socket.id + ') geschlossen');
      sql.db_client_delete(socket);
    });
  });
};