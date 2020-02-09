module.exports = function(app, sql, app_cfg, passport, auth, udp) {

  // get index
  app.get('/', function(req, res) {
    sql.db_list_wachen(function(data) {
      var data_wachen = data
      sql.db_list_traeger(function(data) {
        var data_traeger = data
        sql.db_list_kreis(function(data) {
          var data_kreis = data
          res.render('home', {
            public: app_cfg.public,
            title: 'Startseite',
            list_wache: data_wachen,
            list_traeger: data_traeger,
            list_kreis: data_kreis,
            user: req.user
          });
        });
      });
    });
  });

  // get /waip
  app.get('/waip', function(req, res) {
    res.redirect('/waip/0');
  });

  // get /waip/<wachennummer>
  app.get('/waip/:wachen_id', function(req, res, next) {
    var parmeter_id = req.params.wachen_id;
    sql.db_wache_vorhanden(parmeter_id, function(result) {
      if (result) {
        res.render('waip', {
          title: 'Alarmmonitor',
          wachen_id: parmeter_id,
          data_wache: ' ' + result.name,
          app_id: app_cfg.global.app_id,
          map_tile: app_cfg.global.map_tile,
          user: req.user
        });
      } else {
        var err = new Error('Wache ' + parmeter_id + ' nicht vorhanden!');
        err.status = 404;
        next(err);
      };
    });
  });

  // get /rueckmeldung
  app.get('/rueckmeldung/:waip_uuid', function(req, res, next) {
    var waip_uuid = req.params.waip_uuid;
    sql.db_get_einsatzdaten_by_uuid(waip_uuid, function(einsatzdaten) {
      if (einsatzdaten) {
        res.render('response', {
          title: 'Einsatz-Rückmeldung',
          user: req.user,
          einsatzdaten: einsatzdaten
        });
      } else {
        var err = new Error('Der angefragte Einsatz ist nicht vorhanden!'+waip_uuid);
        err.status = 404;
        next(err);
      };
    });
  });

  app.post('/rueckmeldung/:waip_uuid', function(req, res) {
    console.log('post_rueckmeldung '+JSON.stringify(req.body));
    sql.db_save_response(req.body, function(result){
      if (result) {
        res.redirect('/rueckmeldung/' + req.params.waip_uuid);
      } else {
        var err = new Error('Fehler beim senden der Rückmeldung!');
        err.status = 501;
        next(err);
      };
    });
  });

  // get /config
  app.get('/config', auth.ensureAuthenticated, function(req, res) {
    sql.db_get_userconfig(req.user.id, function(data) {
      res.render('config', {
        public: app_cfg.public,
        title: 'Einstellungen',
        user: req.user,
        reset_counter: data
      });
    });
  });

  app.post('/config', auth.ensureAuthenticated, function(req, res) {
    sql.db_set_userconfig(req.user.id, req.body.set_reset_counter, function(data) {
      res.redirect('/config');
    });
  });

  // get /about
  app.get('/about', function(req, res) {
    res.render('about', {
      public: app_cfg.public,
      title: 'Über',
      user: req.user
    });
  });

  // get /uhr
  app.get('/test_clock', function(req, res) {
    res.render('test_clock', {
      title: 'Test Uhr',
      user: req.user
    });
  });

  // get /test_tableau
  app.get('/test_tableau', function(req, res) {
    res.render('test_wachalarm', {
      title: 'Test Wachalarm',
      map_tile: app_cfg.global.map_tile,
      user: req.user
    });
  });

  // get /test_rueckmeldung
  app.get('/test_rueckmeldung', function(req, res) {
    res.render('test_rueckmeldung', {
      title: 'Test Einsatz-Rückmeldung',
      map_tile: app_cfg.global.map_tile,
      user: req.user
    });
  });

  // get /show_active_user
  app.get('/show_active_user', auth.ensureAdmin, function(req, res) {
    sql.db_get_active_clients(function(data) {
      res.render('show_active_user', {
        title: 'Verbundene PCs/Benutzer',
        user: req.user,
        dataSet: data
      });
    });
  });

  // get /show_active_waip
  app.get('/show_active_waip', auth.ensureAdmin, function(req, res) {
    sql.db_get_active_waips(function(data) {
      res.render('show_active_waip', {
        title: 'Akutelle Einsätze',
        user: req.user,
        dataSet: data
      });
    });
  });

  // get /show_log
  app.get('/show_log', auth.ensureAdmin, function(req, res) {
    sql.db_get_log(function(data) {
      res.render('show_log', {
        title: 'Log-Datei',
        user: req.user,
        dataSet: data
      });
    });
  });

  // get /test_alert
  app.get('/test_alert', auth.ensureAdmin, function(req, res) {
    res.render('test_alert', {
      title: 'Test-Alarm',
      user: req.user,
    });
  });

  app.post('/test_alert', auth.ensureAdmin, function(req, res) {
    udp.send_message(req.body.test_alert);
	res.redirect('/test_alert');
  });

  // get /edit_users
  app.get('/edit_users', auth.ensureAdmin, function(req, res) {
    sql.db_get_users(function(data) {
      res.render('edit_users', {
        title: 'Benutzer und Rechte verwalten',
        user: req.user,
        users: data,
        error: req.flash("errorMessage"),
        success: req.flash("successMessage")
      });
    });
  });

  app.post('/edit_users', auth.ensureAdmin, function(req, res) {
    if (req.user && req.user.permissions == "admin") {
      switch (req.body["modal_method"]) {
        case "DELETE":
          auth.deleteUser(req, res);
          break;
        case "EDIT":
          auth.editUser(req, res);
          break;
        case "ADDNEW":
          auth.createUser(req, res);
          break;
      }
    } else {
      res.redirect('/edit_users');
    }
  });

  // get /login
  app.get('/login', function(req, res) {
    res.render('login', {
      public: app_cfg.public,
      title: 'Login',
      user: req.user
    });
  });

  app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login'
  }), function(req, res) {
    if(req.body.rememberme){
      // der Benutzer muss sich fuer 5 Jahre nicht anmelden
      req.session.cookie.maxAge = 5 * 365 * 24 * 60 * 60 * 1000;
    };
    res.redirect('/');
  });

  app.post('/login_ip', passport.authenticate('ip', {
    failureRedirect: '/login'
  }), function(req, res) {
    // der Benutzer muss sich fuer 5 Jahre nicht anmelden
    req.session.cookie.maxAge = 5 * 365 * 24 * 60 * 60 * 1000;
    res.redirect('/');
  });

  app.post('/logout', function(req, res) {
    req.session.destroy(function(err) {
      res.redirect('/');
    })
  });

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Seite nicht gefunden!');
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
    res.render('error', {
      public: app_cfg.public,
      user: req.user
    });
  });

};
