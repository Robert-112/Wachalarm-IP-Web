var app_cfg = {};

app_cfg.global = {
	webport: 3000,
	udpport: 60233,
	database: './database.sqlite3',
	soundpath: '/public/media/',
	mediapath: '/media/',
	defaultuser: 'me',
	defaultpass: '123',
	saltRounds: 10,
	// TODO: eindeutige ID/Version für Anwendung hinterlegen
	// TODO: Karten-URL für Client festlegen
	app_id: process.pid
};

module.exports = app_cfg;
