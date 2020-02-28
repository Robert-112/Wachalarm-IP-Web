var app_cfg = {};

app_cfg.global = {
	http_port: 3000,
	https_port: 3443,
	udpport: 60233,
	remoteapi: 'http://localhost:8078/api',
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
	app_id: process.pid
};

app_cfg.public = {
	app_name: 'Wachalarm IP-Web',
	company: 'Leitstelle Lausitz',
	version: 'Version 1.2',
	map_tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	map_attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

module.exports = app_cfg;
