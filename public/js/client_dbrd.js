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
  




  var counter_ID = [];

function add_resp_progressbar(p_id, p_type, p_start, p_end) {
  // Split timestamp into [ Y, M, D, h, m, s ]
  //var t1 = zeitstempel.split(/[- :]/),
    //t2 = ablaufzeit.split(/[- :]/);

  //var start = new Date(t1[0], t1[1] - 1, t1[2], t1[3], t1[4], t1[5]),
    //end = new Date(t2[0], t2[1] - 1, t2[2], t2[3], t2[4], t2[5]);

  // Progressbar erstellen falls nicht existiert

    // 
    //<div class="progress mt-1">
  //<div class="progress-bar progress-bar-striped bg-success" role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">2min</div></div>
  $( '#pg-fk' ).append( '<div class="progress mt-1" id="pg-' + p_id + '"></div>' );
  $( '#pg-'+ p_id ).append( '<div id="pg-bar'+ p_id +'" class="progress-bar progress-bar-striped bg-success" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>' );

  
  counter_ID[p_id] = 0;

  clearInterval(counter_ID[p_id]);
  counter_ID[p_id] = setInterval(function() {
    do_progressbar('pg-bar'+ p_id, p_start, p_end);
  }, 1000);
};


  function do_progressbar(div_id, start, end) {
    today = new Date();
    // restliche Zeit ermitteln
    //var current_progress = Math.round(100 / (end.getTime() - start.getTime()) * (end.getTime() - today.getTime()));
    var current_progress = Math.round(100 / (start.getTime() - end.getTime()) * (start.getTime() - today.getTime()));
  
    var diff = Math.abs(end - today);
    var minutesDifference = Math.floor(diff / 1000 / 60);
    diff -= minutesDifference * 1000 * 60;
    var secondsDifference = Math.floor(diff / 1000);
    if (secondsDifference <= 9) {
      secondsDifference = '0' + secondsDifference;
    };
    var minutes = minutesDifference + ':' + secondsDifference;
   
    
    // Progressbar anpassen
    $("#"+div_id)
      .css("width", current_progress + "%")
      .attr("aria-valuenow", current_progress)
      .text(minutes + " min");
  };

  
  

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
    var end5 = new Date(date5.setMinutes(date5.getMinutes() + 1,8 ));

    var date6 = new Date();
    var start6 = new Date(date6.setMinutes(date6.getMinutes() - 0,1));
    var end6 = new Date(date6.setMinutes(date6.getMinutes() + 15,1 ));

    var date7 = new Date();
    var start7 = new Date(date7.setMinutes(date7.getMinutes() - 0,1));
    var end7 = new Date(date7.setMinutes(date7.getMinutes() + 15,1 ));

var arr_resp =  [
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 1,
        "maschinist": 0,
        "fuehrungskraft": 0,
        "agt": 0,
        "set_time": start,
        "arrival_time": end,
        "wache": "117"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 0,
        "set_time": start2,
        "arrival_time": end2,
        "wache": "568"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 1,
        "maschinist": 0,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": start3,
        "arrival_time": end3,
        "wache": "253"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 0,
        "fuehrungskraft": 1,
        "agt": 1,
        "set_time": start4,
        "arrival_time": end4,
        "wache": "252"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 0,
        "fuehrungskraft": 1,
        "agt": 0,
        "set_time": start5,
        "arrival_time": end5,
        "wache": "252"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": start6,
        "arrival_time": end6,
        "wache": "568"
      },
      {
        "waip_uuid": "102bfe08-e414-40de-ae54-a00d9378dd71",
        "einsatzkraft": 0,
        "maschinist": 1,
        "fuehrungskraft": 0,
        "agt": 1,
        "set_time": start7,
        "arrival_time": end7,
        "wache": "568"
      }
    ];





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
      var item_content = '';
      var item_classname = '';
if (arrayItem.einsatzkraft == 1){
  item_content = 'Einsatzkraft';
  item_classname = 'ek'
};
if (arrayItem.maschinist == 1){
  item_content = 'Maschinist';
  item_classname = 'ma'
};
if (arrayItem.fuehrungskraft == 1){
  item_content = 'Führungskraft';
  item_classname = 'fk'
};
if (arrayItem.agt == 1){
  item_content = item_content + (' (AGT)');
  item_classname = item_classname + ('-agt');
};
var item_id = Math.floor(Math.random() * 100) + Math.floor(Math.random() * 100);

      var new_item = {
        id: item_id,
        group: arrayItem.wache,
        className: item_classname,
        start: new Date(arrayItem.set_time),
        end: new Date(arrayItem.arrival_time),
        content: item_content
      };
      if (arrayItem.fuehrungskraft == 1){
        add_resp_progressbar(item_id, item_classname, new Date(arrayItem.set_time), new Date(arrayItem.arrival_time));
      };
       items.add(new_item);
      groups.update({ id: arrayItem.wache, content: arrayItem.wache });
  });

  console.log(items.get());
