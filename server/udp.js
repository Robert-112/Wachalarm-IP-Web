module.exports = function(app_cfg, waip, sql) {

  // Module laden
  var dgram = require('dgram');
  var udp_server = dgram.createSocket('udp4');

  // Funktion um zu pruefen, ob Nachricht im JSON-Format ist
  function isValidJSON(text) {
    try {
      JSON.parse(text);
      return true;
    } catch (error) {
      return false;
    }
  };

  // UDP-Server für Schnittstelle starten
  udp_server.bind(app_cfg.global.udpport);
  udp_server.on('listening', function() {
    var address = udp_server.address();
    sql.db_log('Anwendung', 'UDP Server auf ' + address.address + ':' + address.port + ' gestartet.');
  });

  // Warten auf Einsatzdaten
  udp_server.on('message', function(message, remote) {
    if (isValidJSON(message)) {
      sql.db_log('WAIP', 'Neuer Einsatz von ' + remote.address + ':' + remote.port + ': ' + message);
      waip.einsatz_speichern(message, 'udp');
    } else {
      sql.db_log('Fehler-WAIP', 'Fehler: Einsatz von ' + remote.address + ':' + remote.port + ' Fehlerhaft: ' + message);
    }
  });

  function send_message(message) {
    udp_server.send(message, 0, message.length, app_cfg.global.udpport, 'localhost', function(err, bytes) {
      if (err) throw err;
      sql.db_log('UDP-Testalarm an Localhost (Port ' + app_cfg.global.udpport + ') gesendet.');
      //client.close();
    });
  };

  return {
    send_message: send_message
  };
};
