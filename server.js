// Module laden
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var async = require('async');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
// kann gelöscht werden -> var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');
var passport = require('passport');

// Express-Einstellungen
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
// kann gelöscht werden -> app.use(cookieParser('secret'));

// Scripte einbinden
var app_cfg = require('./server/app_cfg.js');
var sql_cfg = require('./server/sql_cfg')(bcrypt, app_cfg);
var sql = require('./server/sql_qry')(sql_cfg)
var waip_io = require('./server/waip_io')(io, sql, async, app_cfg);
var udp = require('./server/udp')(app_cfg, waip_io, sql);
var auth = require('./server/auth')(app, app_cfg, sql_cfg, bcrypt, passport);
var routes = require('./server/routing')(app, sql, app_cfg, passport, auth);

// Server starten
server.listen(app_cfg.global.webport, function() {
  sql.db_log('Anwendung' ,'Wachalarm-IP-Webserver auf Port ' + app_cfg.global.webport + ' gestartet');
});

// TODO: auf HTTPS mit TLS1.2 umstellen, inkl. WSS
