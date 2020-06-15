module.exports = function (app_cfg, sql, saver) {

  // Module laden
  var dgram = require('dgram');
  var udp_server = dgram.createSocket('udp4');

  // UDP-Server für Schnittstelle starten
  udp_server.bind(app_cfg.global.udpport);
  udp_server.on('listening', function () {
    var address = udp_server.address();
    sql.db_log('Anwendung', 'UDP Server auf ' + address.address + ':' + address.port + ' gestartet.');
  });

  // Warten auf Einsatzdaten
  udp_server.on('message', function (message, remote) {
    saver.save_new_waip(message, 'udp')
  });

  // UDP-Daten senden
  function send_message(message) {
    udp_server.send(message, 0, message.length, app_cfg.global.udpport, 'localhost', function (err, bytes) {
      if (err) throw err;
      sql.db_log('UDP-Testalarm an Localhost (Port ' + app_cfg.global.udpport + ') gesendet.');
    });
  };

  return {
    send_message: send_message
  };
};