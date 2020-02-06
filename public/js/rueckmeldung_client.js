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


/* ########################### */
/* ####### Funktionen ######## */
/* ########################### */


  // Split timestamp into [ Y, M, D, h, m, s ]
  console.log(einsatzdaten);
  var t1 = eisnatzdaten.zeitstempel.split(/[- :]/);

  var start = new Date(t1[0], t1[1] - 1, t1[2], t1[3], t1[4], t1[5]);




/* ########################### */
/* ####### Rückmeldung ####### */
/* ########################### */

$('#rueckmeldung').each(function(index) {
  $(this).on("click", function(){
    $('#responseModal').modal('show');
  });
});