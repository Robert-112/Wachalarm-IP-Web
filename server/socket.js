module.exports = function (io, io_api, sql, app_cfg, waip) {

  // Socket.IO Alarmmonitor

  var nsp_waip = io.of('/waip');

  nsp_waip.on('connection', function (socket) {
    // versuche Client-IP zu ermitteln
    var client_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    //zuerst Server-Version senden, damit der Client diese prueft und die Seite ggf. neu laedt
    socket.emit('io.version', app_cfg.global.app_id);
    // Aufruf des Alarmmonitors einer bestimmten Wache verarbeiten
    socket.on('WAIP', function (wachen_id) {      
      sql.db_log('DEBUG', 'Alarmmonitor Nr. ' + wachen_id + ' von ' + client_ip + ' (' + socket.id + ') aufgerufen.');
      // prüfen ob Wachenummer in der Datenbank hinterlegt ist
      sql.db_wache_vorhanden(wachen_id, function (result) {
        // wenn die Wachennummer vorhanden/plausibel dann weiter
        if (result) {
          // Socket-Room beitreiten
          socket.join(wachen_id, function () {
            // prüfen ob für diese Wache Einsätze vorhanden sind
            sql.db_einsatz_ermitteln(wachen_id, socket, function (result_einsatz) {
              if (result_einsatz) {
                // nur den ersten Einsatz senden, falls mehrere vorhanden sind
                var waip_id = result_einsatz[0].waip_einsaetze_ID;
                sql.db_log('WAIP', 'Einsatz ' + waip_id + ' für Wache ' + wachen_id + ' vorhanden, wird jetzt an Client ' + socket.id + ' gesendet.');
                //letzten Einsatz verteilen
                waip.waip_verteilen(waip_id, socket, wachen_id);
                //vorhandene Rückmeldungen verteilen
                waip.rmld_verteilen_for_one_client(waip_id, socket, wachen_id);
              } else {
                sql.db_log('WAIP', 'Kein Einsatz für Wache ' + wachen_id + ' vorhanden, gehe in Standby');
                // falls kein Einsatz vorhanden ist, dann Standby senden
                socket.emit('io.standby', null);
              };
            });
            // in Statusüberischt speichern
            sql.db_update_client_status(socket, null);
          });
        } else {
          sql.db_log('ERROR', 'Fehler: Wachnnummer ' + wachen_id + 'nicht vorhanden!');
          socket.emit('io.error', 'Fehler: Wachnnummer \'' + wachen_id + '\' nicht vorhanden!');
        };
      });
    });
    // Disconnect
    socket.on('disconnect', function () {
      sql.db_log('DEBUG', 'Alarmmonitor von ' + client_ip + ' (' + socket.id + ') geschlossen.');
      sql.db_client_delete(socket);
    });
  });

// Socket.IO Dashboard

var nsp_dbrd = io.of('/dbrd');

nsp_dbrd.on('connection', function (socket) {
  // versuche Client-IP zu ermitteln
  var client_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  //zuerst Server-Version senden, damit der Client diese prueft und die Seite ggf. neu laedt
  socket.emit('io.version', app_cfg.global.app_id);
  // Aufruf des Dashboards eines bestimmten Einsatzes verarbeiten
  socket.on('dbrd', function (uuid) {      
    sql.db_log('DEBUG', 'Dashboard ' + uuid + ' von ' + client_ip + ' (' + socket.id + ') aufgerufen.');
    // prüfen ob Dashboard/Einsatz vorhanden
    sql.db_einsatz_uuid_vorhanden(uuid, function(dbrd_uuid) {
      // wenn die Wachennummer vorhanden dann weiter
      if (dbrd_uuid) {
        // Socket-Room beitreiten
        socket.join(dbrd_uuid.uuid, function () {
          sql.db_log('DBRD', 'Einsatz ' + dbrd_uuid.uuid + ' für Dashboard ' + dbrd_uuid.uuid + ' vorhanden, wird jetzt an Client ' + socket.id + ' gesendet.');
          //letzten Einsatz verteilen
          waip.dbrd_verteilen(dbrd_uuid.uuid, socket);
          // in Statusüberischt speichern
          sql.db_update_client_status(socket, dbrd_uuid.uuid);
        });
      } else {
        sql.db_log('ERROR', 'Fehler: Dashboard ' + dbrd_uuid.uuid + 'nicht (mehr) vorhanden!');
        socket.emit('io.error', 'Fehler: Dashboard \'' + dbrd_uuid.uuid + '\' nicht (mehr) vorhanden!');
      };
    });
  });
  // Disconnect
  socket.on('disconnect', function (uuid) {
    sql.db_log('DEBUG', 'Dashboard ' + uuid + ' von ' + client_ip + ' (' + socket.id + ') geschlossen.');
    sql.db_client_delete(socket);
  });
});


// Socket.IO API

if (app_cfg.api.enabled) {
  var nsp_api = io.of('/api');

  nsp_api.on('connection', function (socket) {
    // versuche Remote-IP zu ermitteln
    var remote_ip = socket.handshake.headers["x-real-ip"] || socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    //FIXME pruefen ob Verbindung mit passendem Secret und aus IP-Bereich
  	//secret: 'asdfwert1234567890#',
    //access_list: ['192.168.2.20', '192.168.2.30']
    
    // in Liste der Clients mit aufnehmen
    sql.db_update_client_status(socket, 'api');
    // Neuen Einsatz speichern
    socket.on('new_waip', function (data) {   
      sql.db_log('API', 'Neuer Einsatz von ' + remote_ip + ': ' + data);
      waip.einsatz_speichern(data);
    });
    socket.on('new_rmld', function (data) {  
      sql.db_save_rmld(data, function(result){
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


};