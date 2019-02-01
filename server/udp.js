module.exports = function(app_cfg, waip_io, sql){

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
      sql.db_log('WAIP','Neuer Einsatz von ' + remote.address + ':' + remote.port + ': ' + message);
      waip_io.einsatz_speichern(message);
    } else {
      sql.db_log('Fehler-WAIP', 'Fehler: Einsatz von ' + remote.address + ':' + remote.port + ' Fehlerhaft: ' + message);
    }
  });
};
