module.exports = function (app, sql, uuidv4, app_cfg, passport, auth, udp, saver) {

  /* ########################### */
  /* ##### Statische Seiten #### */
  /* ########################### */

  // Startseite
  app.get('/', function (req, res) {
    res.render('home', {
      public: app_cfg.public,
      title: 'Startseite',
      user: req.user
    });
  });

  // Ueber die Anwendung
  app.get('/about', function (req, res) {
    res.render('about', {
      public: app_cfg.public,
      title: 'Über',
      user: req.user
    });
  });

  // Impressum
  app.get('/impressum', function (req, res) {
    if (app_cfg.public.ext_imprint) {
      res.redirect(app_cfg.public.url_imprint);
    } else {
      res.render('imprint', {
        public: app_cfg.public,
        title: 'Impressum',
        user: req.user
      });
    };
  });

  // Datenschutzerklaerung
  app.get('/datenschutz', function (req, res) {
    if (app_cfg.public.ext_privacy) {
      res.redirect(app_cfg.public.url_privacy);
    } else {
      res.render('privacy', {
        public: app_cfg.public,
        title: 'Datenschutzerklärung',
        user: req.user
      });
    };
  });

  // API
  app.get('/api', function (req, res, next) {
    var err = new Error('Sie sind nicht berechtigt diese Seite aufzurufen!');
    err.status = 403;
    next(err);
  });

  /* ##################### */
  /* ####### Login ####### */
  /* ##################### */

  // Loginseite
  app.get('/login', function (req, res) {
    res.render('login', {
      public: app_cfg.public,
      title: 'Login',
      user: req.user,
      error: req.flash('error')
    });
  });

  // Login-Formular verarbeiten
  app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Login fehlgeschlagen! Bitte prüfen Sie Benutzername und Passwort.'
  }), function (req, res) {
    if (req.body.rememberme) {
      // der Benutzer muss sich fuer 5 Jahre nicht anmelden
      req.session.cookie.maxAge = 5 * 365 * 24 * 60 * 60 * 1000;
    };
    res.redirect('/');
  });

  // Login mit IP verarbeiten
  app.post('/login_ip', passport.authenticate('ip', {
    failureRedirect: '/login',
    failureFlash: 'Login mittels IP-Adresse fehlgeschlagen!'
  }), function (req, res) {
    // der Benutzer muss sich fuer 5 Jahre nicht anmelden
    req.session.cookie.maxAge = 5 * 365 * 24 * 60 * 60 * 1000;
    res.redirect('/');
  });

  // Logout verarbeiten
  app.post('/logout', function (req, res) {
    req.session.destroy(function (err) {
      res.redirect('/');
    })
  });

  /* ######################### */
  /* ##### Einstellungen ##### */
  /* ######################### */

  // Einstellungen anzeigen
  app.get('/config', auth.ensureAuthenticated, function (req, res) {
    sql.db_user_get_config(req.user.id, function (data) {
      res.render('user/user_config', {
        public: app_cfg.public,
        title: 'Einstellungen',
        user: req.user,
        reset_counter: data
      });
    });
  });

  // Einstellungen speichern
  app.post('/config', auth.ensureAuthenticated, function (req, res) {
    sql.db_user_set_config(req.user.id, req.body.set_reset_counter, function (data) {
      res.redirect('/config');
    });
  });

  /* ##################### */
  /* ##### Wachalarm ##### */
  /* ##################### */

  // /waip nach /waip/0 umleiten
  app.get('/waip', function (req, res) {
    sql.db_wache_get_all(function (data) {
      res.render('overviews/overview_waip', {
        public: app_cfg.public,
        title: 'Alarmmonitor',
        list_wachen: data,
        user: req.user
      });
    });
  });

  // Alarmmonitor aufloesen /waip/<wachennummer>
  app.get('/waip/:wachen_id', function (req, res, next) {
    var parmeter_id = req.params.wachen_id;
    sql.db_wache_vorhanden(parmeter_id, function (wache) {
      if (wache) {
        res.render('waip', {
          public: app_cfg.public,
          title: 'Alarmmonitor',
          wachen_id: parmeter_id,
          data_wache: wache.name,
          app_id: app_cfg.global.app_id,
          user: req.user
        });
      } else {
        var err = new Error('Wache ' + parmeter_id + ' nicht vorhanden!');
        err.status = 404;
        next(err);
      };
    });
  });

  /* ######################## */
  /* ###### Dashboard ####### */
  /* ######################## */

  // Dasboard-Uebersicht
  app.get('/dbrd', function (req, res) {
    sql.db_einsatz_get_active(function (data) {
      res.render('overviews/overview_dbrd', {
        public: app_cfg.public,
        title: 'Dashboard',
        user: req.user,
        dataSet: data
      });
    });
  });

  // Dasboard fuer einen Einsatz
  app.get('/dbrd/:dbrd_uuid', function (req, res, next) {
    var dbrd_uuid = req.params.dbrd_uuid;
    sql.db_einsatz_check_uuid(dbrd_uuid, function (wache) {
      if (wache) {
        res.render('dbrd', {
          public: app_cfg.public,
          title: 'Dashboard',
          dbrd_uuid: dbrd_uuid,
          app_id: app_cfg.global.app_id,
          user: req.user
        });
      } else {
        var err = new Error('Dashboard oder Einsatz nicht vorhanden!');
        err.status = 404;
        next(err);
      };
    });
  });

  /* ######################## */
  /* ##### Rueckmeldung ##### */
  /* ######################## */

  // Rueckmeldungs-Aufruf ohne waip_uuid eblehnen
  app.get('/rmld', function (req, res, next) {
    var err = new Error('Rückmeldungen sind nur mit gültiger Einsatz-ID erlaubt!');
    err.status = 404;
    next(err);
  });

  // Rueckmeldungs-Aufruf mit waip_uuid aber ohne rmld_uuid an zufällige rmld_uuid weiterleiten
  app.get('/rmld/:waip_uuid', function (req, res, next) {
    res.redirect('/rmld/' + req.params.waip_uuid + '/' + uuidv4());
  });

  // Rueckmeldung anzeigen /rueckmeldung/waip_uuid/rmld_uuid
  app.get('/rmld/:waip_uuid/:rmld_uuid', function (req, res, next) {
    var waip_uuid = req.params.waip_uuid;
    var rmld_uuid = req.params.rmld_uuid;
    sql.db_einsatz_get_by_uuid(waip_uuid, function (einsatzdaten) {
      if (einsatzdaten) {
        sql.db_user_check_permission(req.user, einsatzdaten.id, function (valid) {
          if (!valid) {
            delete einsatzdaten.objekt;
            delete einsatzdaten.besonderheiten;
            delete einsatzdaten.strasse;
            delete einsatzdaten.wgs84_x;
            delete einsatzdaten.wgs84_y;
          };
          einsatzdaten.rmld_uuid = rmld_uuid;
          res.render('rmld', {
            public: app_cfg.public,
            title: 'Einsatz-Rückmeldung',
            user: req.user,
            einsatzdaten: einsatzdaten,
            error: req.flash("errorMessage"),
            success: req.flash("successMessage")
          });
        });
      } else {
        var err = new Error('Der angefragte Einsatz ist nicht - oder nicht mehr - vorhanden!');
        err.status = 404;
        next(err);
      };
    });
  });

  // Rueckmeldung entgegennehmen
  app.post('/rmld/:waip_uuid/:rmld_uuid', function (req, res) {
    // Remote-IP erkennen, fuer Fehler-Auswertung
    var remote_ip = req.headers["x-real-ip"] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // auf Saver verweisen
    saver.save_new_rmld(req.body, remote_ip, 'web', function (saved) {
      var waip_uuid = req.body.waip_uuid;
      var rmld_uuid = req.body.rmld_uuid;
      console.log(saved);
      console.log(req);
      if (saved) {
        req.flash('successMessage', 'Rückmeldung erfolgreich gesendet, auf zum Einsatz!');
        res.redirect('/rmld/' + waip_uuid + '/' + rmld_uuid);
      } else {
        req.flash('errorMessage', 'Fehler beim Senden der Rückmeldung!');
        res.redirect('/rmld/' + waip_uuid + '/' + rmld_uuid);
      };
    });
  });

  /* ########################## */
  /* ##### Administration ##### */
  /* ########################## */

  // verbundene Clients anzeigen
  app.get('/adm_show_clients', auth.ensureAdmin, function (req, res) {
    sql.db_client_get_connected(function (data) {
      res.render('admin/adm_show_clients', {
        public: app_cfg.public,
        title: 'Verbundene PCs/Benutzer',
        user: req.user,
        dataSet: data
      });
    });
  });

  // laufende Einsaetze anzeigen
  app.get('/adm_show_missions', auth.ensureAdmin, function (req, res) {
    sql.db_einsatz_get_active(function (data) {
      res.render('admin/adm_show_missions', {
        public: app_cfg.public,
        title: 'Akutelle Einsätze',
        user: req.user,
        dataSet: data
      });
    });
  });

  // Logdatei
  app.get('/adm_show_log', auth.ensureAdmin, function (req, res) {
    sql.db_log_get_5000(function (data) {
      res.render('admin/adm_show_log', {
        public: app_cfg.public,
        title: 'Log-Datei',
        user: req.user,
        dataSet: data
      });
    });
  });

  // direkten Alarm ausloesen
  app.get('/adm_run_alert', auth.ensureAdmin, function (req, res) {
    res.render('admin/adm_run_alert', {
      public: app_cfg.public,
      title: 'Test-Alarm',
      user: req.user,
    });
  });

  app.post('/adm_run_alert', auth.ensureAdmin, function (req, res) {
    udp.send_message(req.body.test_alert);
    res.redirect('/adm_run_alert');
  });

  // Benutzer editieren
  app.get('/adm_edit_users', auth.ensureAdmin, function (req, res) {
    sql.db_user_get_all(function (data) {
      res.render('admin/adm_edit_users', {
        public: app_cfg.public,
        title: 'Benutzer und Rechte verwalten',
        user: req.user,
        users: data,
        error: req.flash('errorMessage'),
        success: req.flash('successMessage')
      });
    });
  });

  app.post('/adm_edit_users', auth.ensureAdmin, function (req, res) {
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
      res.redirect('/adm_edit_users');
    }
  });

  /* ###################### */
  /* ##### Testseiten ##### */
  /* ###################### */

  // Wachalarm-Uhr testen
  app.get('/test_clock', function (req, res) {
    res.render('tests/test_clock', {
      public: app_cfg.public,
      title: 'Test Uhr',
      user: req.user
    });
  });

  // Alarmmonitor testen
  app.get('/test_wachalarm', function (req, res) {
    res.render('tests/test_wachalarm', {
      public: app_cfg.public,
      title: 'Test Wachalarm',
      user: req.user
    });
  });

  // Rueckmeldung testen
  app.get('/test_rueckmeldung', function (req, res) {
    res.render('tests/test_rueckmeldung', {
      public: app_cfg.public,
      title: 'Test Einsatz-Rückmeldung',
      user: req.user
    });
  });

  // Dashboard testen
  app.get('/test_dashboard', function (req, res) {
    res.render('tests/test_dashboard', {
      public: app_cfg.public,
      title: 'Test Dashboard',
      user: req.user
    });
  });

  /* ######################## */
  /* ##### Fehlerseiten ##### */
  /* ######################## */

  // 404 abfangen und an error handler weiterleiten
  app.use(function (req, res, next) {
    var err = new Error('Seite nicht gefunden!');
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = app_cfg.global.development ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error', {
      public: app_cfg.public,
      user: req.user
    });
  });

};