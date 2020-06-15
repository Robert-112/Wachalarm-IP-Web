module.exports = function (app_cfg, sql, waip, api, uuidv4) {

// Module laden

// Variablen festlegen
var uuid_pattern = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');

function save_new_waip(data, app_id) {

    if (isValidJSON(message)) {
        sql.db_log('WAIP', 'Neuer Einsatz von ' + remote.address + ':' + remote.port + ': ' + message);
    } else {
        sql.db_log('Fehler-WAIP', 'Fehler: Einsatz von ' + remote.address + ':' + remote.port + ' Fehlerhaft: ' + message);
      };

    message = JSON.parse(message);

    // Funktion um zu pruefen, ob Nachricht im JSON-Format ist
  function isValidJSON(text) {
    try {
      JSON.parse(text);
      return true;
    } catch (error) {
      return false;
    }
  };



  waip.waip_speichern(message);
  // Einsatzdaten per API weiterleiten (entweder zum Server oder zum verbunden Client)
  // TODO TEST: Api WAIP
  api.server_to_client_new_waip(message, 'udp');
  api.client_to_server_new_waip(message, 'udp');




    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
    // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
    if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
    };
    nsp_api.emit('from_server_to_client_new_waip', {
        data: data,
        app_id: app_id
    });
    sql.db_log('API', 'Einsatz an ' + app_cfg.endpoint.host + ' gesendet: ' + JSON.stringify(data));
    };
};

function save_new_rmld(data, app_id) {
    // Rückmeldung an verbundenen Client senden, falls funktion aktiviert
    if (app_cfg.api.enabled) {
    // testen ob app_id auch eine uuid ist, falls nicht, eigene app_uuid setzen
    if (!uuid_pattern.test(app_id)) {
        app_id = app_cfg.global.app_id;
    };
    nsp_api.emit('from_server_to_client_new_rmld', {
        data: data,
        app_id: app_id
    });
    sql.db_log('API', 'Rückmeldung an ' + app_cfg.endpoint.host + ' gesendet: ' + JSON.stringify(data));
    };
};

return {
    save_new_waip: save_new_waip,
    save_new_rmld: save_new_rmld
};

};