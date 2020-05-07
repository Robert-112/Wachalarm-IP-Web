var app_cfg = {};

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
	defaultuser: 'me',
	defaultpass: '123',
	defaultuserip: '127.0.0.1',
	ip_auth_range: ['::ffff:172.16.5.0/24', '::ffff:192.168.2.0/24'],
	saltRounds: 10,
	sessionsecret: '0987654321abcdef#xyz',
	backup_rmld: true,
	backup_path: '/bkp/',
	app_id: process.pid
};

app_cfg.public = {
	app_name: 'Wachalarm IP-Web',
	company: 'Leitstelle Lausitz',
	version: 'Version 1.2',
	map_tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	map_attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	// TODO: Link Impressium
	own_imprint: false,
	url_imprint: 'https://www.nix.nix/impressium',
	// TODO: Link Datenschutzerklärung, TLF-Sofort
	own_privacy: false,
	url_privacy: 'https://www.nix.nix/datenschutz'
};

app_cfg.api = {
	secret: 'asdfwert1234567890#',
	access_list: ['192.168.2.20', '192.168.2.30']
};

app_cfg.remote = {
	endpoint_host: 'localhost',
	endpoint_port: '8090',
	endpoint_route: '/api',
	secret: 'asdfwert1234567890#',
	allow_mission_type: ['Brandeinsatz', 'Hilfeleistung'],
	allow_data_type: ['uuid', 'nummer', 'alarmzeit', 'art', 'stichwort', 'sondersignal', 'ort', 'ortsteil', 'wgs84_area']
};

module.exports = app_cfg;
