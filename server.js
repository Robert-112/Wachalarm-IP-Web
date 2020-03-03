// Module laden
var fs = require('fs');
var express = require('express');
var app = express();
var http = require('http') //.Server(app);
var https = require('https'); //.Server(app);
var webserver = https.createServer({
  key: fs.readFileSync('./misc/server.key', 'utf8'),
  cert: fs.readFileSync('./misc/server.cert', 'utf8')
}, app);
var io = require('socket.io').listen(webserver);
var async = require('async');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var passport = require('passport');

// Express-Einstellungen
app.set('views', path.join(__dirname, 'views'));
app.locals.basedir = app.get('views');
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// Scripte einbinden
var app_cfg = require('./server/app_cfg.js');
var sql_cfg = require('./server/sql_cfg')(fs, bcrypt, app_cfg);
var sql = require('./server/sql_qry')(sql_cfg, async, app_cfg);
var waip = require('./server/waip')(io, sql, async, app_cfg);
var socket = require('./server/socket')(io, sql, app_cfg, waip);
var udp = require('./server/udp')(app_cfg, waip, sql);
var auth = require('./server/auth')(app, app_cfg, sql_cfg, async, bcrypt, passport, io);
var routes = require('./server/routing')(app, sql, app_cfg, passport, auth, waip, udp);

// Server starten
webserver.listen(app_cfg.global.https_port, function() {
  sql.db_log('Anwendung', 'Wachalarm-IP-Webserver auf Port ' + app_cfg.global.https_port + ' gestartet');
});

// Redirect all HTTP traffic to HTTPS
http.createServer(function(req, res) {
  var host = req.headers.host;
  // prüfen ob host gesetzt, sonst 404
  if (typeof host !== 'undefined' && host) {
    // Anfrage auf https umleiten
    host = host.replace(/:\d+$/, ":" + app_cfg.global.https_port);
    res.writeHead(301, {
      "Location": "https://" + host + req.url
    });
    res.end();
  } else {
    // HTTP status 404: NotFound
	res.writeHead(404, {
	  "Content-Type": "text/plain"
	});
	res.write("404 Not Found - use https instead!\n");
	res.end();
  };
}).listen(app_cfg.global.http_port);

// TODO: auf HTTPS mit TLS1.2 umstellen, inkl. WSS
