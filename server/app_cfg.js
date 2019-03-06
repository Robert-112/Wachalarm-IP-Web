var app_cfg = {};

app_cfg.global = {
	webport: 3000,
	udpport: 60233,
	database: './database.sqlite3',
	soundpath: '/public/media/',
	mediapath: '/media/',
	defaultuser: 'me',
	defaultpass: '123',
	defaultuserip: '127.0.0.1',
	saltRounds: 10,
	sessionsecret: '0987654321abcdef#xyz',
	// TODO: eindeutige ID/Version für Anwendung hinterlegen
	// TODO: Karten-URL für Client festlegen
	app_id: process.pid,
	map_tile: '/media/maps/tiles_bw/{z}/{x}/{y}.png'
};

module.exports = app_cfg;
