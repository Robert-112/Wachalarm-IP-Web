module.exports = function(io, sql, app_cfg, waip) {

  // Module laden
  //client.js
  var io_api = require('socket.io-client');
  var socket_api = io_api.connect(app_cfg.global.remoteapi, {reconnect: true});

// Add a connect listener
socket_api.on('connect', function (socket_api) {
    console.log('Connected!');
});
socket_api.emit('CH01', 'me', 'test msg');
  
  
  // Socket.IO Server
  io.on('connection', function(socket) {
    sql.db_log('WAIP', 'Anwendung von ' + socket.request.connection.remoteAddress + ' (' + socket.id + ') geoeffnet');
    io.sockets.to(socket.id).emit('io.version', app_cfg.global.app_id);
    // disconnect
    socket.on('disconnect', function() {
      sql.db_log('WAIP', 'Alarmmonitor von ' + socket.request.connection.remoteAddress + ' (' + socket.id + ') geschlossen');
      sql.db_client_delete(socket.id);
    });
    // Aufruf des Alarmmonitors einer bestimmten Wache verarbeiten
    socket.on('wachen_id', function(wachen_id) {
      sql.db_log('WAIP', 'Alarmmonitor Nr. ' + wachen_id + ' von ' + socket.request.connection.remoteAddress + ' (' + socket.id + ') aufgerufen');
      // prüfen ob Wachenummer in der Datenbank hinterlegt ist
      sql.db_wache_vorhanden(wachen_id,function(result) {
        // wenn die Wachennummer vorhanden/plausibel dann weiter
        if (result) {
          // Socket-Room beitreiten
          socket.join(wachen_id, function() {
            // Socket-ID und Client-IP in der Datenbank speichern
            sql.db_client_save(socket.id, socket.request.connection.remoteAddress, wachen_id);
            // prüfen ob für diese Wache ein Einsatz vorhanden ist
            sql.db_einsatz_vorhanden(wachen_id, socket.request.user.id, function(result_einsatz) {
              if (result_einsatz) {
                console.log(result_einsatz[0].waip_einsaetze_ID);
                sql.db_log('WAIP', 'Einsatz ' + result_einsatz[0].waip_einsaetze_ID + ' fuer Wache ' + wachen_id + ' vorhanden');
                //letzten Einsatz verteilen
                waip.einsatz_verteilen(result_einsatz[0].waip_einsaetze_ID, socket.id, wachen_id);
                sql.db_update_client_status(socket, result_einsatz[0].waip_einsaetze_ID);
                //vorhanden Rückmeldungen verteilen
                sql.db_get_response_wache(result_einsatz[0].waip_einsaetze_ID, function(result){
                  if (result) {
                    waip.reuckmeldung_verteilen(result_einsatz[0].waip_einsaetze_ID, result);
                  };
                });
              } else {
                sql.db_log('WAIP', 'Kein Einsatz fuer Wache ' + wachen_id + ' vorhanden, Standby');
                //oder falls kein Einsatz vorhanden ist, dann
                io.sockets.to(socket.id).emit('io.standby', null);
                sql.db_update_client_status(socket, null);
              };
            });
          });
        } else {
          sql.db_log('Fehler-WAIP', 'Fehler: Wachnnummer ' + wachen_id + 'nicht vorhanden');
          io.sockets.to(socket.id).emit('io.error', 'Fehler: Wachnnummer \'' + wachen_id + '\' nicht vorhanden!');
        };
      });
    });
    socket.on('response', function(waip_id, responseobj) {
      //var i_ek = ek ? 1 : 0;
      //var i_ma = ma ? 1 : 0;
      //var i_fk = fk ? 1 : 0;
      //var i_agt = agt ? 1 : 0;
      sql.db_update_response(waip_id, responseobj, function(result){
        waip.reuckmeldung_verteilen(waip_id, result);
      });
    });
    // TODO: socket.on(Version) um Server-Version abzugleichen
  });

  
  

  //return {
   // send_message: send_message
  //};
};
