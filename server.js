const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http');
const https = require('https');
const webserver = https.createServer({
  key: fs.readFileSync('./misc/server.key', 'utf8'),
  cert: fs.readFileSync('./misc/server.cert', 'utf8')
}, app);
const io = require('socket.io').listen(webserver);
const async = require('async');
const path = require('path');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');

// Basis-Konfiguration laden und generische App-UUID erzeugen
var app_cfg = require('./server/app_cfg.js');
app_cfg.global.app_id = uuidv4();

// Express-Einstellungen
app.set('views', path.join(__dirname, 'views'));
app.locals.basedir = app.get('views');
app.set('view engine', 'pug');
if (!app_cfg.global.development) {
  app.set('view cache', true);
};
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// Scripte einbinden
var sql_cfg = require('./server/sql_cfg')(fs, bcrypt, app_cfg);
var sql = require('./server/sql_qry')(sql_cfg, uuidv4, app_cfg);
var brk = require('./server/broker')(app_cfg, sql, uuidv4);
var proof = require('./server/proof')(app_cfg, sql);
var waip = require('./server/waip')(io, sql, fs, brk, async, app_cfg, proof);
var socket = require('./server/socket')(io, sql, app_cfg, waip);
var api = require('./server/api')(io, sql, app_cfg, waip);
var udp = require('./server/udp')(app_cfg, waip, sql, api);
var auth = require('./server/auth')(app, app_cfg, sql_cfg, async, bcrypt, passport, io);
var routes = require('./server/routing')(app, sql, uuidv4, app_cfg, passport, auth, waip, udp, api);


// Server starten
webserver.listen(app_cfg.global.https_port, function () {
  sql.db_log('Anwendung', 'Wachalarm-IP-Webserver auf Port ' + app_cfg.global.https_port + ' gestartet');
});

// Redirect all HTTP traffic to HTTPS
http.createServer(function (req, res) {
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