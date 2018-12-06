module.exports = function(app, sql, app_cfg) {

  // get index
  app.get('/', function(req, res) {
    sql.db_list_wachen(function(data) {
      var data_wachen = data
      sql.db_list_traeger(function(data) {
        var data_traeger = data
        sql.db_list_kreis(function(data) {
          var data_kreis = data
          res.render('home', {
            title: 'Startseite',
            list_wache: data_wachen,
            list_traeger: data_traeger,
            list_kreis: data_kreis
          });
        });
      });
    });
  });

  // get /waip
  app.get('/waip', function(req, res) {
    res.render('waip', {
      title: 'Wachalarm-IP-Web'
    });
  });

  // get /waip/<wachennummer>
  app.get('/waip/:wachen_id', function(req, res) {
    sql.db_wache_vorhanden(req.params.wachen_id, function(result) {
      res.render('waip', {
        title: 'Alarmmonitor',
        wachen_id: req.params.wachen_id,
        data_wache: ' '+ result.name,
        app_id: app_cfg.global.app_id
      });
    });
  });

  // get /ueber
  app.get('/ueber', function(req, res) {
    res.render('ueber', {
      title: 'Über'
    });
  });

  // get /uhr
  app.get('/test_clock', function(req, res) {
    res.render('test_clock', {
      title: 'Test Uhr'
    });
  });

  // get /test_tableau
  app.get('/test_tableau', function(req, res) {
    res.render('test_wachalarm', {
      title: 'Test Wachalarm'
    });
  });

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

};
