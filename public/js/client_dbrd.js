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

var arr_resp =  [
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 1,
        "maschinist": 0,
        "fuehrungskraft": 0,
        "agt": 0,
        "set_time": "2020-02-07T08:59:20.066Z",
        "arrival_time": "2020-03-07T09:04:20.066Z",
        "wache": "117"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": "2020-02-07T16:37:26.875Z",
        "arrival_time": "2020-02-07T16:47:26.875Z",
        "wache": "568"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 1,
        "maschinist": 0,
        "fuehrungskraft": 0,
        "agt": 0,
        "set_time": "2020-02-10T19:34:51.794Z",
        "arrival_time": "2020-02-10T19:39:51.794Z",
        "wache": "253"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 1,
        "maschinist": 0,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": "2020-02-10T21:01:01.470Z",
        "arrival_time": "2020-02-10T21:11:01.470Z",
        "wache": "252"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 0,
        "set_time": "2020-02-20T09:20:35.221Z",
        "arrival_time": "2020-02-20T09:30:35.221Z",
        "wache": "252"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": "2020-02-20T12:10:13.373Z",
        "arrival_time": "2020-02-20T12:20:13.373Z",
        "wache": "568"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": "2020-02-21T11:36:46.921Z",
        "arrival_time": "2020-02-21T11:51:46.921Z",
        "wache": "568"
      }
    ];



    var date = new Date();
    date.setMinutes(date.getMinutes() - 0,1 );
    var start = new Date(date);
    date.setMinutes(date.getMinutes() +4,9 );
    var end = new Date(date);

    var date2 = new Date();
    var start2 = new Date(date2.setMinutes(date2.getMinutes() - 1));
    var end2 = new Date(date2.setMinutes(date2.getMinutes() + 9 ));

    var date3 = new Date();
    var start3 = new Date(date3.setMinutes(date3.getMinutes() - 1,5));
    var end3 = new Date(date3.setMinutes(date3.getMinutes() + 4,5 ));

    var date4 = new Date();
    var start4 = new Date(date4.setMinutes(date4.getMinutes() + 0,8 ));
    var end4 = new Date(date4.setMinutes(date4.getMinutes() + 10,8 ));

    var date5 = new Date();
    var start5 = new Date(date5.setMinutes(date5.getMinutes() - 0,2));
    var end5 = new Date(date5.setMinutes(date5.getMinutes() + 9,8 ));

    var date6 = new Date();
    var start6 = new Date(date6.setMinutes(date6.getMinutes() - 0,1));
    var end6 = new Date(date6.setMinutes(date6.getMinutes() + 15,1 ));

    var item5 = document.createElement('div');
    item5.className = 'ion-md-star';
    item5.innerHTML = '<a>&nbsp;Klaus (AGT)</a>';

    var item2 = document.createElement('div');
    item2.className = 'ion-md-star';
    item2.innerHTML = '<a>&nbsp;Günter (AGT)</a>';

    var items = new vis.DataSet([
   /* {id: 1, group: 0, className: 'ma', content: 'Hans', start: start, end: end},
    {id: 2, group: 0, className: 'fk-agt', content: item2, start: start2, end: end2},
    {id: 3, group: 1, className: 'ek', content: 'Rudi', start: start3, end: end3},
    {id: 4, group: 1, className: 'ek-agt', content: item5, start: start4, end: end4},
    {id: 5, group: 1, className: 'ma', content: 'Jürgen', start: start5, end: end5},
    {id: 6, group: 1, className: 'ek', content: 'Florian', start: start6, end: end6},
    */]);

    var markerText = 'Alarmierung';
    var id2 = "id2";
    var customDate = new Date();
    var alert_start = new Date(customDate.setMinutes(customDate.getMinutes() - 2));
    var timeline_end = new Date(customDate.setMinutes(customDate.getMinutes() + 13));
  



    // Configuration for the Timeline
    var options = {
      rollingMode: {
        follow: true,
        offset: 0.25
      },
      start: alert_start,
      end: timeline_end
    };
    // Create a Timeline
    var timeline = new vis.Timeline(container, items, options);
    timeline.setGroups(groups);
    // DOM element where the Timeline will be attached
    var container2 = document.getElementById('visualization2');
    // Create a DataSet (allows two way data-binding)
    var items2 = new vis.DataSet([

    ]);

    timeline.addCustomTime(
      alert_start,
      id2
    );
    timeline.setCustomTimeMarker(markerText, id2, false);

    // Configuration for the Timeline
    //var options2 = {};
    // Create a Timeline
    //var timeline2 = new vis.Timeline(container2, items2, options2);

 
    arr_resp.forEach(function (arrayItem) {
      //var x = arrayItem.prop1 + 2;
      //console.log(x);

      var new_item = {
        id: Math.floor(Math.random() * 100) + Math.floor(Math.random() * 100),
        group: arrayItem.wache,
        className: "ma",
        start: new Date(arrayItem.set_time),
        end: new Date(arrayItem.arrival_time),
        content: 'avhtlktlkj'//,
        //className: 'New Item'
      };
      items.add(new_item);
      groups.update({ id: arrayItem.wache, content: arrayItem.wache });
  });

  console.log(items.get());
