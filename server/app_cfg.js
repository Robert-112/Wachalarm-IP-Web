var app_cfg = {};

app_cfg.global = {
	http_port: 3000,
	https_port: 3443,
	udpport: 60233,
	database: './database.sqlite3',
	soundpath: '/public/media/',
	mediapath: '/media/',
	defaultuser: 'me',
	defaultpass: '123',
	defaultuserip: '127.0.0.1',
	ip_auth_range: ['::ffff:172.16.5.0/24', '::ffff:192.168.2.0/24'],
	saltRounds: 10,
	sessionsecret: '0987654321abcdef#xyz',
	app_id: process.pid,
	map_tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

module.exports = app_cfg;
