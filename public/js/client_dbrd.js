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
/* ####### Timeline ######## */
/* ########################### */

    // DOM element where the Timeline will be attached
    var container = document.getElementById('visualization');
    // Create a DataSet (allows two way data-binding)
    var names = ["CB FW Cottbus 1", "CB FW Madlow", "Lee", "Grant"];
    var groupCount = 2;
    var groups = new vis.DataSet();
    for (var g = 0; g < groupCount; g++) {
      groups.add({ id: g, content: names[g] });
    };



    var date = new Date();
    date.setMinutes(date.getMinutes() + 4 );
    var start = new Date(date);
    date.setMinutes(date.getMinutes() + 5 );
    var end = new Date(date);

    var date2 = new Date();
    date2.setMinutes(date2.getMinutes() - 2);
    var start2 = new Date(date2);
    date2.setMinutes(date2.getMinutes() + 10 );
    var end2 = new Date(date2);

    var items = new vis.DataSet([
    {id: 1, group: 0, className: 'ma', content: 'Hans', start: start, end: end},
    {id: 2, group: 0, className: 'fk', content: 'Günter', start: start2, end: end2},
    /*{id: 3, group: 1, className: 'ek', content: 'Ilse', start: '2020-02-28T16:15:00', end: '2020-02-28T16:20:00'},
    {id: 4, group: 1, className: 'ek', content: 'Meyer', start: '2020-02-28T16:37:00', end: '2020-02-28T16:47:00'},
    {id: 5, group: 1, className: 'ma', content: 'Jürgen', start: '2020-02-28T18:34:00', end: '2020-02-28T18:49:00'},
    {id: 6, group: 1, className: 'ek', content: 'Florian', start: '2020-02-28T18:45:00', end: '2020-02-28T18:55:00'},
    */]);
    // Configuration for the Timeline
    var options = {};
    // Create a Timeline
    var timeline = new vis.Timeline(container, items, options);
    timeline.setGroups(groups);
    // DOM element where the Timeline will be attached
    var container2 = document.getElementById('visualization2');
    // Create a DataSet (allows two way data-binding)
    var items2 = new vis.DataSet([

    ]);
    // Configuration for the Timeline
    var options2 = {};
    // Create a Timeline
    var timeline2 = new vis.Timeline(container2, items2, options2);

    var mark = new Date();
    var durationInMinutes = 20;
    mark.setMinutes(mark.getMinutes() - durationInMinutes);
    var markerText = 'Alarmierung';

    timeline.addCustomTime(start, 9);
    timeline.setCustomTimeMarker(markerText, 9);
