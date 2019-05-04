module.exports = function(app, app_cfg, db, async, bcrypt, passport, io) {

  var session = require('express-session');
  var cookieParser = require('cookie-parser');
  var flash = require('req-flash');
  var SQLiteStore = require('connect-sqlite3')(session);
  var LocalStrategy = require('passport-local').Strategy;
  var IpStrategy = require('passport-ip').Strategy;
  var passportSocketIo = require('passport.socketio');
  var sessionStore = new SQLiteStore({
    //db: app_cfg.global.database,
    //concurrentDB: true
  });

  app.use(session({
    store: sessionStore,
    key: "connect.sid",
    secret: app_cfg.global.sessionsecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 1000
    } // Standard ist eine Stunde
  }));
  app.use(cookieParser());
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());

  io.use(passportSocketIo.authorize({
    cookieParser: cookieParser, // the same middleware you registrer in express
    key: "connect.sid", // the name of the cookie where express/connect stores its session_id
    secret: app_cfg.global.sessionsecret, // the session_secret to parse the cookie
    store: sessionStore, // we NEED to use a sessionstore. no memorystore please
    success: function(data, accept) {
      //console.log('successful connection to socket.io');
      accept(null, true);
    },
    fail: function(data, message, error, accept) {
      //console.log('failed connection to socket.io:', data, message);
      accept(null, true);
    }
  }));

  // Benutzerauthentifizierung per Login
  passport.use(new LocalStrategy({
    usernameField: 'user'
  }, function(user, password, done) {
    db.get('SELECT password FROM waip_users WHERE user = ?', user, function(err, row) {
      if (!row) return done(null, false);
      bcrypt.compare(password, row.password, function(err, res) {
        if (!res) return done(null, false);
        db.get('SELECT user, id FROM waip_users WHERE user = ?', user, function(err, row) {
          return done(null, row);
        });
      });
    });
  }));

  // Benutzerauthentifizierung per IP
  passport.use(new IpStrategy({
    range: app_cfg.global.ip_auth_range
  }, function(profile, done) {
    var profile_ip = profile.id
    profile_ip = profile_ip.replace(/^(::ffff:)/, "");
    db.get('SELECT user, id FROM waip_users WHERE ip_address = ?', profile_ip, function(err, row) {
      if (!row) {
        return done(null, false);
      } else {
        return done(null, row);
      };
    });
  }));

  passport.serializeUser(function(user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    db.get(`SELECT id, user, permissions,
      (select reset_counter from waip_configs where user_id = ?) reset_counter
      FROM waip_users WHERE id = ?`, [id, id], function(err, row) {
      if (!row) {
        return done(null, false);
      }
      return done(null, row);
    });
  });

  // Funktion die prueft ob der Benutzer angemeldet ist
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      // req.user is available for use here
      return next();
    }
    // denied. redirect to login
    res.redirect('/login')
  }

  //TODO: ensureAuthenticated für admin-user erstellen
  //-> req.user && req.user.permissions == "admin"

  function createUser(req, res) {
    db.get('SELECT user FROM waip_users WHERE user = ?', req.body.username, function(err, row) {
      // if(err)
      if (row) {
        req.flash('errorMessage', "Es existiert bereits ein Benutzer mit diesem Namen!");
        res.redirect('/edit_users');
      } else {
        bcrypt.hash(req.body.password, app_cfg.global.saltRounds, function(err, hash) {
          db.run('INSERT INTO waip_users ( user, password, permissions, ip_address ) VALUES( ?, ?, ?, ? )', req.body.username, hash, req.body.permissions, req.body.ip, function(err) {
            // if(err)
            if (this.lastID) {
              req.flash('successMessage', "Neuer Benutzer wurde angelegt.");
              res.redirect('/edit_users');
            } else {
              req.flash('errorMessage', "Da ist etwas schief gegangen...");
              res.redirect('/edit_users');
            }
          });
        });
      }
    });
  };

  function deleteUser(req, res) {
    if (req.user.id == req.body.id) {
      req.flash('errorMessage', "Sie können sich nicht selbst löschen!");
      res.redirect('/edit_users');
    } else {
      db.run('DELETE FROM waip_users WHERE id = ?', req.body.id, function(err) {
        if (err) {
          //...
        } else {
          req.flash('successMessage', "Benutzer \'" + req.body.username + "\' wurde gelöscht!");
          res.redirect('/edit_users');
        }
      });
    }
  };

  function editUser(req, res) {
    async.series([
        function(callback) {
          req.runquery = false;
          req.query = "UPDATE waip_users SET ";
          if (req.body.password.length == 0) {
            req.flash('successMessage', "Passwort wurde nicht geändert.");
            callback(null, 'password_checked');
          } else {
            bcrypt.hash(req.body.password, app_cfg.global.saltRounds, function(err, hash) {
              if (err) console.log(err)
              req.flash('successMessage', "Passwort geändert.");
              req.query += "password = '" + hash + "', ";
              req.runquery = true;
              callback(null, 'password_checked');
            });
          };
        },
        function(callback) {
          if (req.user.id == req.body.modal_id && req.body.permissions != "admin") {
            req.flash('errorMessage', "Sie können Ihr Recht als Administrator nicht selbst ändern!");
            callback(null, 'permissions_checked');
          } else {
            req.query += "permissions = '" + req.body.permissions + "', ip_address ='" + req.body.ip + "'";
            req.runquery = true;
            callback(null, 'permissions_checked');
          };
        }
      ],
      function(err, results) {
        if (req.runquery == true) {
          req.query += " WHERE id = " + req.body.modal_id;
          console.log(req.query);
          db.run(req.query, function(err) {
            if (err) {
              //...
              console.log(err);
              req.flash('errorMessage', "Da ist etwas schief gegangen...");
              res.redirect('/edit_users');
            } else {
              req.flash('successMessage', "Benutzer aktualisiert.");
              res.redirect('/edit_users');
            }
          });
        } else {
          req.flash('errorMessage', "Da ist etwas schief gegangen...");
          res.redirect('/edit_users');
        }
      });
  };

  return {
    ensureAuthenticated: ensureAuthenticated,
    createUser: createUser,
    deleteUser: deleteUser,
    editUser: editUser
  };
};
