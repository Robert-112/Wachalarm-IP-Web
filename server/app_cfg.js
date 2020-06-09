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
  time_to_delete_waip: 60,
  default_time_for_standby: 10,
  circumcircle: 5,
  defaultuser: 'me',
  defaultpass: '123',
  defaultuserip: '127.0.0.1',
  ip_auth_range: ['::ffff:172.16.5.0/24', '::ffff:192.168.2.0/24'],
  saltRounds: 10,
  sessionsecret: '0987654321abcdef#xyz',
  backup_rmld_to_mail: true,
  backup_rmld_to_file: true,
  backup_path: '/misc/bkp/'  
};

// Einstellungen zur Erscheinung der Seite
app_cfg.public = {
  url: 'https://wachalarm.info.tm',
  app_name: 'Wachalarm IP-Web',
  company: 'Leitstelle Lausitz',
  version: 'Version 1.2',
  map_tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  map_attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ext_imprint: false,
  url_imprint: 'https://www.nix.nix/impressium',
  ext_privacy: false,
  url_privacy: 'https://www.nix.nix/datenschutz'
};

// Daten von anderen Servern empfangen
app_cfg.api = {
  enabled: true,
  secret: 'asdfwert1234567890#',
  access_list: ['192.168.2.20', '192.168.2.30'],
  send_mission_type: ['Brandeinsatz', 'Hilfeleistung'],
  send_data_type: ['uuid', 'nummer', 'alarmzeit', 'art', 'stichwort', 'sondersignal', 'ort', 'ortsteil', 'wgs84_area']
};

// Daten an andere Server senden
app_cfg.endpoint = {
  enabled: true,
  host: 'https://192.168.1.25:8090/api',
  secret: 'asdfwert1234567890#'  
};

module.exports = app_cfg;