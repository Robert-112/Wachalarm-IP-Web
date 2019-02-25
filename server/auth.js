module.exports = function (app, app_cfg, db, bcrypt, passport, LocalStrategy) {

  var session = require('express-session');
  var SQLiteStore = require('connect-sqlite3')(session);
  var LocalStrategy = require('passport-local').Strategy;

  app.use(session({
    store: new SQLiteStore({
      //db: app_cfg.global.database,
      //concurrentDB: true
    }),
    secret: app_cfg.global.sessionsecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 1000
    } // 1 Stunde
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Benutzerauthentifizierung
  passport.use(new LocalStrategy({
    usernameField: 'user'
  }, function (user, password, done) {
    db.get('SELECT password FROM waip_users WHERE user = ?', user, function (err, row) {
      if (!row) return done(null, false);
      bcrypt.compare(password, row.password, function (err, res) {
        if (!res) return done(null, false);
        db.get('SELECT user, id FROM waip_users WHERE user = ?', user, function (err, row) {
          return done(null, row);
        });
      });
    });
  }));

  passport.serializeUser(function (user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    db.get('SELECT id, user, permissions FROM waip_users WHERE id = ?', id, function (err, row) {
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
      return next(); }
  
    // denied. redirect to login
    res.redirect('/login')
  }

  //TODO: ensureAuthenticated für admin-user erstellen

  return{
    ensureAuthenticated: ensureAuthenticated
  };
};