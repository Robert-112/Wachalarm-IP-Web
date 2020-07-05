var app_cfg = {};

// Server-Einstellungen
app_cfg.global = {
  development: true,
  http_port: 3000,
  https_port: 3443,
  udpport: 60233,
  database: './database.sqlite3',
  soundpath: '/public/media/',
  mediapath: '/media/',
  time_to_delete_waip: 4,
  default_time_for_standby: 10,
  circumcircle: 5,
  defaultuser: 'me',
  defaultpass: '123',
  defaultuserip: '127.0.0.1',
  ip_auth_range: ['::ffff:172.16.5.0/24', '::ffff:192.168.2.0/24'],
  saltRounds: 10,
  sessionsecret: '0987654321abcdef#xyz'
};

// Einstellungen zur Erscheinung der Seite
app_cfg.public = {
  url: 'https://wachalarm.mooo.com',
  app_name: 'Wachalarm IP-Web',
  company: 'Leitstelle Lausitz',
  version: 'Version 1.2.1',
  map_tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  map_attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ext_imprint: false,
  url_imprint: 'https://www.nix.nix/impressium',
  ext_privacy: false,
  url_privacy: 'https://www.nix.nix/datenschutz'
};

// Einstellungen fuer Backups von Rueckmeldungen
app_cfg.rmld = {
  backup_to_file: true,
  backup_path: '/misc/bkp/',
  backup_to_mail: false,
  mailserver_host: 'smtp.xxx.xxx',
  mailserver_port: 587,
  secure_mail: false,
  unauthorized_mail: false,
  mail_user: 'testuser',
  mail_pass: 'testuserpass',//'testpass',
  mail_from: 'xyz@xxx.xxx'//'keineantwort@wachalarm.info.tm'
};

// Schnittstelle um Daten von anderen Clients zu empfangen
app_cfg.api = {
  enabled: true,
  secret: 'asdfwert1234567890#',
  access_list: ['192.168.2.20', '192.168.2.30', '80.147.87.170']
};

// Schnittstelle um Daten an andere Server zu senden
app_cfg.endpoint = {
  enabled: true,
  host: 'https://wachalarm.leitstelle-lausitz.de/api',
  secret: 'asdfwert1234567890#'
};

// Schnittstellendaten von bestimmten Clients entfernen (Datenschutzoption)
app_cfg.filter = {
  enabled: true,
  on_message_from: ['192.168.2.20', 'https://192.168.1.25:8090/api'],
  remove_data: ['besonderheiten', 'strasse', 'objekt', 'objektnr', 'wachfolge', 'wgs84_x', 'wgs84_y']
};

module.exports = app_cfg;
