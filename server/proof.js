module.exports = function (app_cfg, sql) {

  // Module laden
  const test = 'test';

  function validate_waip(data, callback) {
    // TODO Validierung: Einsatzdaten auf Validität prüfen

    // Log
    if (app_cfg.global.development) {
      console.log('Validierung WAIP: ' + JSON.stringify(data));
    };

    callback && callback(true);
    // SQL-Log
  };

  function validate_rmld(data, callback) {
    // TODO Validierung: Rueckmeldung auf plausibilität

    // Log
    if (app_cfg.global.development) {
      console.log('Validierung RMLD: ' + JSON.stringify(data));
    };

    callback && callback(true);
    // SQL-Log
  };

  return {
    validate_waip: validate_waip,
    validate_rmld: validate_rmld
  };
};