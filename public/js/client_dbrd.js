/* ########################### */
/* ######### LEAFLET ######### */
/* ########################### */

// Karte definieren
var map = L.map('map', {
    zoomControl: false
  }).setView([51.733005, 14.338048], 13);
  
  // Layer der Karte
  mapLink = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //map_tile, {
      maxZoom: 18
    }).addTo(map);
  
  // Icon der Karte zuordnen
  var redIcon = new L.Icon({
    iconUrl: '/media/marker-icon-2x-red.png',
    shadowUrl: '/media/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  // Icon setzen
  var marker = L.marker(new L.LatLng(0, 0), {
    icon: redIcon
  }).addTo(map);
  
  // Karte setzen
  map.removeLayer(marker);
  marker = L.marker(new L.LatLng(einsatzdaten_obj.wgs84_x, einsatzdaten_obj.wgs84_y), {
    icon: redIcon
  }).addTo(map);
  map.setView(new L.LatLng(einsatzdaten_obj.wgs84_x, einsatzdaten_obj.wgs84_y), 13);
  
  
  /* ########################### */
  /* ####### Funktionen ######## */
  /* ########################### */
  
  
  // Split timestamp into [ Y, M, D, h, m, s ]
  var t1 = einsatzdaten_obj.zeitstempel.split(/[- :]/);
  var d = new Date(t1[0], t1[1] - 1, t1[2], t1[3], t1[4], t1[5]);
  
  // Zeitwerte
  var curr_day = d.getDay();
  var curr_date = d.getDate();
  var curr_month_id = d.getMonth();
  curr_month_id = curr_month_id + 1;
  var curr_year = d.getFullYear();
  var curr_hour = d.getHours();
  var curr_min = d.getMinutes();
  var curr_sek = d.getSeconds();
  // Tag und Monat Anpassen
  if ((String(curr_date)).length == 1)
    curr_date = '0' + curr_date;
  if ((String(curr_month_id)).length == 1)
    curr_month_id = '0' + curr_month_id;
  // Uhrzeit anpassen
  if (curr_min <= 9) {
    curr_min = '0' + curr_min;
  };
  if (curr_hour <= 9) {
    curr_hour = '0' + curr_hour;
  };
  if (curr_sek <= 9) {
    curr_sek = '0' + curr_sek;
  };
  var curr_month = d.getMonth();
  var curr_year = d.getFullYear();
  
  // Datum und Uhrzeit setzen
  $("#einsatz_datum").text(curr_date + '.' + curr_month_id + '.' + curr_year);
  $("#einsatz_uhrzeit").text(curr_hour + ':' + curr_min + ':' + curr_sek);
