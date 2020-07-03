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

// GeoJSON vordefinieren
var geojson = L.geoJSON().addTo(map);


/* ########################### */
/* ####### Rückmeldung ####### */
/* ########################### */

var counter_rmld = [];

var counter_ID = 0;

function start_counter(zeitstempel, ablaufzeit) {
  // Split timestamp into [ Y, M, D, h, m, s ]
  var t1 = zeitstempel.split(/[- :]/),
    t2 = ablaufzeit.split(/[- :]/);

  var start = new Date(t1[0], t1[1] - 1, t1[2], t1[3], t1[4], t1[5]),
    end = new Date(t2[0], t2[1] - 1, t2[2], t2[3], t2[4], t2[5]);

  clearInterval(counter_ID);
  counter_ID = setInterval(function () {
    do_progressbar(start, end);
  }, 1000);
};

function reset_rmld(p_uuid) {
  var bar_uuid = 'bar-' + p_uuid;
  $('#pg-ek').children().each(function (i) {
    if (!$(this).hasClass(bar_uuid)) {
      $(this).remove();
    };
  });
  $('#pg-ma').children().each(function (i) {
    if (!$(this).hasClass(bar_uuid)) {
      $(this).remove();
    };
  });
  $('#pg-fk').children().each(function (i) {
    if (!$(this).hasClass(bar_uuid)) {
      $(this).remove();
    };
  });
};

function add_resp_progressbar(p_uuid, p_id, p_type, p_agt, p_start, p_end) {
  // Hintergrund der Progressbar festlegen
  var bar_background = '';
  var bar_border = '';
  if (p_agt) {
    bar_border = 'border border-warning';
  };
  switch (p_type) {
    case 'ek':
      bar_background = 'bg-success';
      break;
    case 'ma':
      bar_background = 'bg-info';
      break;
    case 'fk':
      bar_background = 'bg-light';
      break;
    default:
      bar_background = '';
      break;
  };
  var bar_uuid = 'bar-' + p_uuid;
  // pruefen ob div mit id 'pg-'+p_id schon vorhanden ist
  var pgbar = document.getElementById('pg-' + p_id);
  if (!pgbar) {
    $('#pg-' + p_type).append('<div class="progress mt-1 position-relative ' + bar_border + ' ' + bar_uuid + '" id="pg-' + p_id + '" style="height: 15px; font-size: 14px;"></div>');
    $('#pg-' + p_id).append('<div id="pg-bar-' + p_id + '" class="progress-bar progress-bar-striped ' + bar_background + '" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>');
    $('#pg-bar-' + p_id).append('<small id="pg-text-' + p_id + '" class="justify-content-center d-flex position-absolute w-100"></small>');
  } else {
    // TODO PG-Bar ändern falls neue/angepasste Rückmeldung
  };
  // Zeitschiene Anpassen
  clearInterval(counter_rmld[p_id]);
  counter_rmld[p_id] = 0;
  counter_rmld[p_id] = setInterval(function () {
    do_rmld_bar(p_id, p_start, p_end);
  }, 1000);
};

function do_rmld_bar(p_id, start, end) {
  //console.log(p_id);
  today = new Date();
  // restliche Zeit ermitteln
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
  if (current_progress >= 100) {
    $('#pg-bar-' + p_id)
      .css('width', '100%')
      .attr('aria-valuenow', 100)
      .addClass('ion-md-checkmark-circle');
    $('#pg-text-' + p_id).text('');
    // FIXME Counter_Id not defined
    clearInterval(counter_ID[p_id]);
  } else {
    $('#pg-bar-' + p_id)
      .css('width', current_progress + '%')
      .attr('aria-valuenow', current_progress);
    $('#pg-text-' + p_id).text(minutes);
  };
};

function recount_rmld(p_uuid) {
  var bar_uuid = 'bar-' + p_uuid;
  var agt_count = 0;
  // Zähler auf 0 Setzen
  $('#ek-counter').text(0);
  $('#ma-counter').text(0);
  $('#fk-counter').text(0);
  $('#agt-counter').text(0);
  // EK zählen
  $('#pg-ek').children().each(function (i) {
    if ($(this).hasClass(bar_uuid)) {
      var tmp_count = parseInt($('#ek-counter').text());
      $('#ek-counter').text(tmp_count + 1);
      if ($(this).hasClass('border-warning')) {
        agt_count++;
      };
    };
  });
  // MA zählen
  $('#pg-ma').children().each(function (i) {
    if ($(this).hasClass(bar_uuid)) {
      var tmp_count = parseInt($('#ma-counter').text());
      $('#ma-counter').text(tmp_count + 1);
      if ($(this).hasClass('border-warning')) {
        agt_count++;
      };
    };
  });
  // FK zählen
  $('#pg-fk').children().each(function (i) {
    if ($(this).hasClass(bar_uuid)) {
      var tmp_count = parseInt($('#fk-counter').text());
      $('#fk-counter').text(tmp_count + 1);
      if ($(this).hasClass('border-warning')) {
        agt_count++;
      };
    };
  });
  // AGT setzen
  $('#agt-counter').text(agt_count);
  // Rückmeldecontainer anzeigen/ausblenden
  if ($('#ek-counter').text() == '0' && $('#ma-counter').text() == '0' && $('#fk-counter').text() == '0' && $('#agt-counter').text() == '0') {
    $('#rmld_container').addClass('d-none');
  } else {
    $('#rmld_container').removeClass('d-none');
  };
};
  
  

/* ########################### */
/* ####### Timeline ######## */
/* ########################### */

    // DOM element where the Timeline will be attached
    var container = document.getElementById('visualization');
    var items = new vis.DataSet();
    var groups = new vis.DataSet();

    // Configuration for the Timeline
    var customDate = new Date();
    var alert_start = new Date(customDate.setMinutes(customDate.getMinutes() - 2));
    var timeline_end = new Date(customDate.setMinutes(customDate.getMinutes() + 13));
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
 
/* ########################### */
/* ######## SOCKET.IO ######## */
/* ########################### */

// Websocket
var socket = io('/dbrd');

// Wachen-ID bei Connect an Server senden
socket.on('connect', function () {
  socket.emit('dbrd', dbrd_uuid);
  $('#waipModal').modal('hide');
  // TODO: bei Reconnect des Clients durch Verbindungsabbruch, erneut Daten anfordern
});

socket.on('connect_error', function (err) {
  $('#waipModalTitle').html('FEHLER');
  $('#waipModalBody').html('Verbindung zum Server getrennt!');
  $('#waipModal').modal('show');
});

// ID von Server und Client vergleichen, falls ungleich -> Seite neu laden
socket.on('io.version', function (server_id) {
  if (client_id != server_id) {
    $('#waipModal').modal('hide');
    setTimeout(function () {
      $('#waipModalTitle').html('ACHTUNG');
      $('#waipModalBody').html('Neue Server-Version. Seite wird in 10 Sekunden neu geladen!');
      $('#waipModal').modal('show');
      setTimeout(function () {
        location.reload();
      }, 10000);
    }, 1000);
  };
});

// ggf. Fehler ausgeben
socket.on('io.error', function (data) {
  console.log('Error:', data);
});

// Daten löschen, Uhr anzeigen
socket.on('io.deleted', function (data) {
	console.log('del')
  // Einsatz nicht mehr vorhanden
  $('#waipModal').modal('hide');
  setTimeout(function () {
    $('#waipModalTitle').html('ACHTUNG');
    $('#waipModalBody').html(`Der aufgerufene Einsatz wurde gel&ouml;scht und ist in diesem System nicht mehr verfügbar.<br>
    Sie werden in einer Minute auf die Startseite zurück`);
    $('#waipModal').modal('show');
    setTimeout(function () {
      window.location.href = window.location.origin;
    }, 60000);
  }, 1000);
});

// Einsatzdaten laden, Wachalarm anzeigen
socket.on('io.Einsatz', function (data) {
  // DEBUG
  console.log(data);
  // Einsatz-ID speichern
  waip_id = data.id;
  // DBRD-ID und Zeit setzten
  $('#dbrd_id').html(data.uuid);
  $('#einsatz_datum').html(data.zeitstempel);
  
  // Hintergrund der Einsatzart zunächst entfernen
  $('#einsatz_art').removeClass(function (index, className) {
    return (className.match(/(^|\s)bg-\S+/g) || []).join(' ');
  });
  // Icon der Einsatzart enfernen
  $('#einsatz_stichwort').removeClass();
  // Art und Stichwort festlegen hinterlegen
  switch (data.einsatzart) {
    case 'Brandeinsatz':
      $('#einsatz_art').addClass('bg-danger');
      $('#einsatz_stichwort').addClass('ion-md-flame');
      $('#rueckmeldung').removeClass('d-none');
      break;
    case 'Hilfeleistungseinsatz':
      $('#einsatz_art').addClass('bg-info');
      $('#einsatz_stichwort').addClass('ion-md-construct');
      $('#rueckmeldung').removeClass('d-none');
      break;
    case 'Rettungseinsatz':
      $('#einsatz_art').addClass('bg-warning');
      $('#einsatz_stichwort').addClass('ion-md-medkit');
      break;
    case 'Krankentransport':
      $('#einsatz_art').addClass('bg-success');
      $('#einsatz_stichwort').addClass('ion-md-medical');
      break;
    default:
      $('#einsatz_art').addClass('bg-secondary');
      $('#einsatz_stichwort').addClass('ion-md-information-circle');
  };
  $('#einsatz_stichwort').html(' ' + data.stichwort);
  // Sondersignal setzen
  $('#sondersignal').removeClass();
  switch (data.sondersignal) {
    case 1:
      $('#sondersignal').addClass('ion-md-notifications');
      break;
    default:
      $('#sondersignal').addClass('ion-md-notifications-off');
  };
  // Ortsdaten zusammenstellen und setzen
  $('#einsatzort_list').empty();
  if (data.objekt) {
    $('#einsatzort_list').append('<li class="list-group-item">' + data.objekt+ '</li>');
  };
  if (data.ort) {
    $('#einsatzort_list').append('<li class="list-group-item">' + data.ort+ '</li>');
  };
  if (data.ortsteil) {
    $('#einsatzort_list').append('<li class="list-group-item">' + data.ortsteil+ '</li>');
  };
  if (data.strasse) {
    $('#einsatzort_list').append('<li class="list-group-item">' + data.strasse+ '</li>');
  };
  if (data.besonderheiten) {
    $('#einsatzort_list').append('<li class="list-group-item text-warning">' + data.besonderheiten+ '</li>');
  };
  // Einsatzmittel-Tabelle
  for (var i in data.einsatzmittel) {
    var table_em = document.getElementById('table_einsatzmittel');
    var wache_vorhanden = false;
    var wache_zeile = 0;
    for (var j = 0, row; row = table_em.rows[j]; j++) {
      //console.log(row.cells[0].innerHTML);
      if (row.cells[0].innerHTML == data.einsatzmittel[i].wachenname) {
        wache_vorhanden = true;
        wache_zeile = j;
      };
    };
    if (wache_vorhanden) {
      var flex_div = document.createElement('div');
      flex_div.className = 'd-flex flex-wrap justify-content-between align-items-center';

      var flex_under_div = document.createElement('div');
      flex_under_div.className = 'flex-fill rounded bg-secondary p-2 m-1';

      var justify_div = document.createElement('div');
      justify_div.className = 'd-flex justify-content-between';

      var em_div  = document.createElement('div');
      em_div.className = 'pr-2';
      em_div.innerHTML = data.einsatzmittel[i].einsatzmittel;
      
      var status_div  = document.createElement('div');
      status_div.className = 'p-2 badge badge-dark';
      status_div.innerHTML = data.einsatzmittel[i].status;

      flex_div.appendChild(flex_under_div);

      flex_under_div.appendChild(justify_div);

      justify_div.appendChild(em_div);
      justify_div.appendChild(status_div);

      table_em.rows[wache_zeile].cells[1].appendChild(flex_div);

      //var newText2 = document.createTextNode(data.einsatzmittel[i].einsatzmittel);
      //newCell2.appendChild(newText2);
      //table_em.rows[wache_zeile].cells[1].appendChild(newText2);
      //table_em.rows[wache_zeile].cells[1].setAttribute('pr-2');
    } else {
      var tableRef = document.getElementById('table_einsatzmittel').getElementsByTagName('tbody')[0];
      var newRow = tableRef.insertRow();
      var newCell = newRow.insertCell(0);
      var newText = document.createTextNode(data.einsatzmittel[i].wachenname);
      //newCell.outerHTML = "<th></th>";
      newCell.appendChild(newText);
      


      var flex_div = document.createElement('div');
      flex_div.className = 'd-flex flex-wrap justify-content-between align-items-center';

      var flex_under_div = document.createElement('div');
      flex_under_div.className = 'flex-fill rounded bg-secondary p-2 m-1';

      var justify_div = document.createElement('div');
      justify_div.className = 'd-flex justify-content-between';

      var em_div  = document.createElement('div');
      em_div.className = 'pr-2';
      em_div.innerHTML = data.einsatzmittel[i].einsatzmittel;
      
      var status_div  = document.createElement('div');
      status_div.className = 'p-2 badge badge-dark';
      status_div.innerHTML = data.einsatzmittel[i].status;

      flex_div.appendChild(flex_under_div);

      flex_under_div.appendChild(justify_div);

      justify_div.appendChild(em_div);
      justify_div.appendChild(status_div);

      table_em.rows[wache_zeile].cells[1].appendChild(flex_div);

      var newCell2 = newRow.insertCell(1);
      var newText2 = document.createTextNode(data.einsatzmittel[i].einsatzmittel);
      newCell2.appendChild(flex_div);
    };
  
    
/*
th(scope='row') CB FW Cottbus 1
                td
                  div

                    div.flex-fill.rounded.bg-secondary.p-2.m-1
                      div.d-flex.justify-content-between
                        div.pr-2 FL CB 01/42-01
                        div.p-2.badge.badge-success 2
                  
                    div.flex-fill.rounded.bg-secondary.p-2.m-1
                      div.d-flex.justify-content-between
                        div.pr-2 FL CB 01/82-01
                        div.p-2.badge.badge-warning 3
*/



  };
  // Karte leeren
  map.removeLayer(marker);
  map.removeLayer(geojson);
  // Karte setzen
  if (data.wgs84_x && data.wgs84_y) {
    marker = L.marker(new L.LatLng(data.wgs84_x, data.wgs84_y), {
      icon: redIcon
    }).addTo(map);
    map.setView(new L.LatLng(data.wgs84_x, data.wgs84_y), 15);
  } else {
    geojson = L.geoJSON(JSON.parse(data.wgs84_area));
    geojson.addTo(map);
    map.fitBounds(geojson.getBounds());
    map.setZoom(13);
  };
  // Marker in Timeline setzen
  var markerText = 'Alarmierung';
  var alarm_zeit = 'alarm_zeit';
    
    
    timeline.addCustomTime(
      data.zeitstempel,
      alarm_zeit
    );
    timeline.setCustomTimeMarker(markerText, alarm_zeit, false);
    
    // Configuration for the Timeline
    //var options2 = {};
    // Create a Timeline
    //var timeline2 = new vis.Timeline(container2, items2, options2);

  // TODO Ablaufzeit setzen
});

socket.on('io.new_rmld', function (data) {
  // DEBUG
  console.log(data);
  // FIXME  Änderung des Funktions-Typ berücksichtigen
  // Neue Rueckmeldung hinterlegen
  data.forEach(function (arrayItem) {
    // HTML festlegen
    var item_type = '';
    var item_content = '';
    var item_classname = '';
    // wenn Einsatzkraft dann:
    if (arrayItem.einsatzkraft) {
      item_content = 'Einsatzkraft';
      item_classname = 'ek';
      item_type = 'ek';
    };
    // wenn Maschinist dann:
    if (arrayItem.maschinist) {
      item_content = 'Maschinist';
      item_classname = 'ma';
      item_type = 'ma';
    };
    // wenn Fuehrungskraft dann:
    if (arrayItem.fuehrungskraft) {
      item_content = 'Führungskraft';
      item_classname = 'fk'
      item_type = 'fk';
    };
    // wenn AGT
    var item_agt = arrayItem.agt;
    if (arrayItem.agt){
      item_content = item_content + (' (AGT)');
      item_classname = item_classname + ('-agt');
    };
    // Variablen für Anzeige vorbereiten
    var pg_waip_uuid = arrayItem.waip_uuid;
    var pg_rmld_uuid = arrayItem.rmld_uuid;
    var pg_start = new Date(arrayItem.set_time);
    var pg_end = new Date(arrayItem.arrival_time);
    var timeline_item = {
      id: arrayItem.resp_uuid,
      group: arrayItem.wache_id,
      className: item_classname,
      start: new Date(arrayItem.set_time),
      end: new Date(arrayItem.arrival_time),
      content: item_content
    };
    // Progressbar hinterlegen
    add_resp_progressbar(pg_waip_uuid, pg_rmld_uuid, item_type, item_agt, pg_start, pg_end);
    // in Timeline hinterlegen
    items.update(timeline_item);
    groups.update({ id: arrayItem.wache_id, content: arrayItem.wache_name });
    // Anzahl der Rückmeldung zählen
    recount_rmld(pg_waip_uuid);
  });

});
