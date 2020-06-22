// TODO: Remote-Reload per Socket
// TODO: Modal bei Server-Verbindung, und Modal bei Reload

$(document).ready(function () {
  set_clock();
});

$(window).on('resize', function () {
  resize_text();
  // Position neu setzen
  var newq = makeNewPosition();
  $('.clock_y').css('top', newq[0]);
  $('.clock_y').css('left', newq[1]);
  // langsam verschieben
  animateDiv();
});

/* ############################ */
/* ######### BUTTONS ########## */
/* ############################ */


var waipAudio = document.getElementById('audio');

waipAudio.addEventListener('ended', function () {
  console.log('ended');
  
  var tmp_element;
  // Pause-Symbol in Play-Symbol
  tmp_element = document.querySelector('.ion-md-pause');
  if (tmp_element.classList.contains('ion-md-pause')) {
    tmp_element.classList.remove('ion-md-pause');
    tmp_element.classList.add('ion-md-play-circle');
  };
  // Lautsprecher-Symbol in Leise-Symbol
  tmp_element = document.querySelector('.ion-md-volume-high');
  if (tmp_element.classList.contains('ion-md-volume-high')) {
    tmp_element.classList.remove('ion-md-volume-high');
    tmp_element.classList.add('ion-md-volume-off');
  };
  // Button Hintergrund entfernen, falls vorhanden
  tmp_element = document.querySelector('#volume');
  if (tmp_element.classList.contains('btn-danger')) {
    tmp_element.classList.remove('btn-danger');
  };
});

waipAudio.addEventListener('play', function () {  
  var tmp_element;
  // Pause-Symbol in Play-Symbol
  tmp_element = document.querySelector('.ion-md-play-circle');
  if (tmp_element.classList.contains('ion-md-play-circle')) {
    tmp_element.classList.remove('ion-md-play-circle');
    tmp_element.classList.add('ion-md-pause');
  };  
  // Lautsprecher-Symbol in Leise-Symbol
  tmp_element = document.querySelector('.ion-md-volume-off');
  if (tmp_element.classList.contains('ion-md-volume-off')) {
    tmp_element.classList.remove('ion-md-volume-off');
    tmp_element.classList.add('ion-md-volume-high');
  };  
  // Button Hintergrund entfernen, falls vorhanden
  tmp_element = document.querySelector('#volume');
  if (tmp_element.classList.contains('btn-danger')) {
    tmp_element.classList.remove('btn-danger');
  };
});

$('#replay').on('click', function (event) {
  document.getElementById('audio').play();
});

/* ############################ */
/* ####### TEXT-RESIZE ######## */
/* ############################ */

// Größen dynamisch anpassen, Hintergrundfarbe ggf. anpassen
function resize_text() {
  // Uhr-Text nur Anpassen wenn sichtbar
  if ($('#waipclock').is(':visible')) {
    textFit(document.getElementsByClassName('tf_clock'), {
      minFontSize: 3,
      maxFontSize: 500
    });
    $('body').css('background-color', '#000');
  };
  // Tableau nur Anpassen wenn sichtbar
  if ($('#waiptableau').is(':visible')) {
    textFit(document.getElementsByClassName('tf_singleline'), {
      minFontSize: 1,
      maxFontSize: 500
    });
    textFit(document.getElementsByClassName('tf_multiline'), {
      detectMultiLine: false
    });
    // Karte neu setzen
    map.invalidateSize();
    $('body').css('background-color', '#222');
  };
};

// Text nach bestimmter Laenge, in Abhaengigkeit von Zeichen, umbrechen
function break_text_15(text) {
  var new_text;
  new_text = text.replace(/.{15}(\s+|\-+)+/g, '$&@')
  new_text = new_text.split(/@/);
  new_text = new_text.join('<br>');
  //console.log(new_text);
  return new_text;
};

function break_text_35(text) {
  var new_text;
  new_text = text.replace(/.{50}\S*\s+/g, '$&@').split(/\s+@/);
  new_text = new_text.join('<br>');
  //console.log(new_text);
  return new_text;
};

/* ############################ */
/* ####### INAKTIVITAET ####### */
/* ############################ */

var timeoutID;

// Inactivitaet auswerten
function setup_inactivcheck() {
  this.addEventListener('mousemove', resetActivTimer, false);
  this.addEventListener('mousedown', resetActivTimer, false);
  this.addEventListener('keypress', resetActivTimer, false);
  this.addEventListener('DOMMouseScroll', resetActivTimer, false);
  this.addEventListener('mousewheel', resetActivTimer, {
    passive: true
  }, false);
  this.addEventListener('touchmove', resetActivTimer, false);
  this.addEventListener('MSPointerMove', resetActivTimer, false);
  start_inactivtimer();
};

setup_inactivcheck();

// warte xxxx Millisekunden um dann do_on_Inactive zu starten
function start_inactivtimer() {
  clearTimeout(timeoutID);
  timeoutID = window.setTimeout(do_on_Inactive, 3000);
};

// bei Inaktivitaet Header/Footer ausblenden
function do_on_Inactive() {
  // do something
  $('.navbar').fadeOut('slow');
  $('.footer').fadeOut('slow');
  $('.fullheight').css({
    height: 'calc(100vh - 2rem)',
    cursor: 'none'
  });
  $('body').css({
    paddingTop: '1rem',
    margin: 0
  });
  resize_text();
};

// bei Activitaet Header/Footer einblenden
function do_on_Active() {
  start_inactivtimer();
  // do something
  $('.navbar').fadeIn('slow');
  $('.footer').fadeIn('slow');
  $('body').css({
    marginBottom: '60px',
    paddingTop: '5rem',
    paddingBottom: '0'
  });
  $('.fullheight').css({
    height: 'calc(100vh - 60px - 5rem)',
    cursor: 'auto'
  });
  resize_text();
};

// bei Event (Aktiviaet) alles zuruecksetzen
function resetActivTimer(e) {
  do_on_Active();
};

/* ############################ */
/* ####### Progressbar ####### */
/* ############################ */

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

function do_progressbar(start, end) {
  today = new Date();
  // restliche Zeit ermitteln
  var current_progress = Math.round(100 / (end.getTime() - start.getTime()) * (end.getTime() - today.getTime()));

  var diff = Math.abs(end - today);
  var minutesDifference = Math.floor(diff / 1000 / 60);
  diff -= minutesDifference * 1000 * 60;
  var secondsDifference = Math.floor(diff / 1000);
  if (secondsDifference <= 9) {
    secondsDifference = '0' + secondsDifference;
  };
  var minutes = minutesDifference + ':' + secondsDifference;
  // Progressbar anpassen
  $('#hilfsfrist')
    .css('width', current_progress + '%')
    .attr('aria-valuenow', current_progress)
    .text(minutes + ' min');
};

/* ########################### */
/* ######### LEAFLET ######### */
/* ########################### */

// Karte definieren
var map = L.map('map', {
  zoomControl: false
}).setView([51.733005, 14.338048], 13);

// Layer der Karte
mapLink = L.tileLayer(
  map_tile, {
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
/* ######## SOCKET.IO ######## */
/* ########################### */

// Websocket
var socket = io('/waip');

// Wachen-ID bei Connect an Server senden
socket.on('connect', function () {
  socket.emit('WAIP', wachen_id);
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

// Sounds stoppen
socket.on('io.stopaudio', function (data) {
  tmp_audio = document.getElementById('audio');
  tmp_audio.pause();
  tmp_audio.currentTime = 0;
});

// Sounds abspielen
socket.on('io.playtts', function (data) {
  var audio = document.getElementById('audio');
  audio.src = (data);
  console.log($('#audio'));

  // Audio-Blockade des Browsers erkennen
  var playPromise = document.querySelector('audio').play();

  // In browsers that don’t yet support this functionality,
  // playPromise won’t be defined.
  if (playPromise !== undefined) {
    playPromise.then(function () {
      // Automatic playback started!
      audio.play();
      //$('.ion-md-volume-high').toggleClass('ion-md-pause');
    }).catch(function (error) {
      console.log('Automatic playback failed');
      // Automatic playback failed.
      // Show a UI element to let the user manually start playback.
      var tmp_element;
      tmp_element = document.querySelector('#volume');
      if (!tmp_element.classList.contains('btn-danger')) {
        tmp_element.classList.add('btn-danger');
      };
      tmp_element = document.querySelector('.ion-md-volume-high');
      if (tmp_element.classList.contains('ion-md-volume-high')) {
        tmp_element.classList.remove('ion-md-volume-high');
        tmp_element.classList.add('ion-md-volume-off');
      };  
    });
  };
});

// Daten löschen, Uhr anzeigen
socket.on('io.standby', function (data) {
  // Einsatz-ID auf 0 setzen
  waip_id = null;
  // TODO: Wenn vorhanden, hier #hilfsfrist zurücksetzen
  $('#einsatz_art').removeClass(function (index, className) {
    return (className.match(/(^|\s)bg-\S+/g) || []).join(' ');
  });
  $('#einsatz_stichwort').removeClass();
  $('#einsatz_stichwort').html('');
  $('#sondersignal').removeClass();
  $('#ortsdaten').html('');
  $('#besonderheiten').html('');
  $('#em_alarmiert').empty();
  $('#em_weitere').html('');
  reset_rmld();
  recount_rmld();
  map.setView(new L.LatLng(0, 0), 14);
  // Tareset_responsebleau ausblenden
  $('#waiptableau').addClass('d-none');
  $('#waipclock').removeClass('d-none');
  // Text anpassen
  resize_text();
  // Position neu setzen
  setTimeout(function () {
    // Position neu setzen
    var newq = makeNewPosition();
    $('.clock_y').css('top', newq[0]);
    $('.clock_y').css('left', newq[1]);
    // langsam verschieben
    animateDiv();
  }, 1000);
});

// Einsatzdaten laden, Wachalarm anzeigen
socket.on('io.new_waip', function (data) {
  // DEBUG
  console.log(data);
  // Einsatz-ID speichern
  waip_id = data.id;
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
  var small_ortsdaten;
  small_ortsdaten = '';
  if (data.objekt) {
    small_ortsdaten = small_ortsdaten + break_text_15(data.objekt) + '<br>';
  };
  if (data.ort) {
    small_ortsdaten = small_ortsdaten + break_text_15(data.ort) + '<br>';
  };
  if (data.ortsteil) {
    small_ortsdaten = small_ortsdaten + break_text_15(data.ortsteil) + '<br>';
  };
  if (data.strasse) {
    small_ortsdaten = small_ortsdaten + break_text_15(data.strasse) + '<br>';
  };
  if (small_ortsdaten.substr(small_ortsdaten.length - 4) == '<br>') {
    small_ortsdaten = small_ortsdaten.slice(0, -4);
  };
  $('#ortsdaten').html(small_ortsdaten);
  // Besonderheiten setzen
  $('#besonderheiten').html(break_text_35(data.besonderheiten));
  // alarmierte Einsatzmittel setzen
  $('#em_alarmiert').empty();
  var data_em_alarmiert = JSON.parse(data.em_alarmiert);
  for (var i in data_em_alarmiert) {
    var tmp = data_em_alarmiert[i].name.replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-');
    $('#em_alarmiert').append('<div id="cn_' + tmp + '" class="rounded bg-secondary d-flex justify-content-between flex-fill p-2 m-1"></div>');
    $('#cn_' + tmp).append('<div class="pr-2">' + data_em_alarmiert[i].name + '</div>');
  };
  // weitere alarmierte Einsatzmittel setzen
  $('#em_weitere').html('');

  try {
    var data_em_weitere = JSON.parse(data.em_weitere);

    if (data_em_weitere.length > 0) {
      var tmp_weitere;
      for (var i in data_em_weitere) {
        if (tmp_weitere) {
          tmp_weitere = tmp_weitere + ', ' + data_em_weitere[i].name;
        } else {
          tmp_weitere = data_em_weitere[i].name;
        };
      };
      $('#em_weitere').html(tmp_weitere);
    };
  } catch (e) {
    //console.log(e); // error in the above string (in this case, yes)!
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
  // Ablaufzeit setzen
  start_counter(data.zeitstempel, data.ablaufzeit);
  // alte Rückmeldung entfernen
  reset_rmld(data.uuid);
  recount_rmld(data.uuid);
  // TODO: Einzeige vergrößern wenn Felder nicht angezeigt werden
  // Uhr ausblenden
  $('#waipclock').addClass('d-none');
  $('#waiptableau').removeClass('d-none');
  // Text anpassen
  resize_text();
});

socket.on('io.new_rmld', function (data) {
  // DEBUG
  console.log(data);
  // FIXME  Änderung des Funktions-Typ berücksichtigen
  // Neue Rueckmeldung hinterlegen
  data.forEach(function (arrayItem) {
    // HTML festlegen
    var item_type = '';
    // wenn Einsatzkraft dann:
    if (arrayItem.einsatzkraft) {
      item_type = 'ek';
    };
    // wenn Maschinist dann:
    if (arrayItem.maschinist) {
      item_type = 'ma';
    };
    // wenn Fuehrungskraft dann:
    if (arrayItem.fuehrungskraft) {
      item_type = 'fk';
    };
    // wenn AGT
    var item_agt = arrayItem.agt;
    // Variablen für Anzeige vorbereiten
    var pg_waip_uuid = arrayItem.waip_uuid;
    console.log(arrayItem.waip_uuid);
    console.log(pg_waip_uuid);
    var pg_rmld_uuid = arrayItem.rmld_uuid;
    var pg_start = new Date(arrayItem.set_time);
    var pg_end = new Date(arrayItem.arrival_time);
    // Progressbar hinterlegen
    add_resp_progressbar(pg_waip_uuid, pg_rmld_uuid, item_type, item_agt, pg_start, pg_end);
    // Anzahl der Rückmeldung zählen
    recount_rmld(pg_waip_uuid);
  });
  // Text anpassen
  resize_text();
});

/* ########################### */
/* ####### Rückmeldung ####### */
/* ########################### */

var counter_rmld = [];

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
  /*$('#pg-ek').empty();
  $('#pg-ma').empty();
  $('#pg-fk').empty();
  $('#ek-counter').text(0);
  $('#ma-counter').text(0);
  $('#fk-counter').text(0);
  $('#agt-counter').text(0);*/
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
/* ####### SCREENSAVER ####### */
/* ########################### */

// Uhrzeit und Datum für Bildschirmschoner
function set_clock() {
  // TODO Sekunden anzeigen
  // Wochentage
  var d_names = new Array('Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag');
  // Monate
  var m_names = new Array('Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember');
  // Aktuelle Zeit
  var d = new Date();
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
  // Uhrzeit und Minute anpassen
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
  var element_time = curr_hour + ':' + curr_min;
  var element_day = d_names[curr_day] + ', ' + curr_date + '. ' + m_names[curr_month];
  var element_date_time = curr_date + '.' + curr_month_id + '.' + curr_year + ' - ' + element_time + ':' + curr_sek;
  // Easter-Egg :-)
  if (element_time.substr(0, 5) == '13:37') {
    element_time = '1337';
  };
  // nur erneuern wenn sich Zeit geändert hat
  if ($('#time').text() !== element_time) {
    // Uhrzeit anzeigen
    $('#time').html(element_time);
    // Datum (Text) anzeigen
    $('#day').html(element_day);
    // Datum anzeigen, sofern sichtbar
    $('#date-time').html(element_date_time);
    // Textgröße neu setzen
    resize_text();
  };
};

// Uhrzeit jede Sekunden anpassen
setInterval(set_clock, 1000);

// Uhrzeit verschieben
$(document).ready(function () {
  setTimeout(function () {
    // Position neu setzen
    var newq = makeNewPosition();
    $('.clock_y').css('top', newq[0]);
    $('.clock_y').css('left', newq[1]);
    // langsam verschieben
    animateDiv();
  }, 1000);
});

// neue Random-Position fuer Uhrzeit ermitteln
function makeNewPosition() {
  // Get viewport dimensions 
  var h = $('.fullheight').height() - $('.clock_y').height();
  var w = $('.fullheight').width() - $('.clock_y').width();
  var nh = Math.floor(Math.random() * h);
  var nw = Math.floor(Math.random() * w);
  return [nh, nw];
};

// Verschieben animieren
function animateDiv() {
  var newq = makeNewPosition();
  var oldq = $('.clock_y').offset();
  var speed = calcSpeed([oldq.top, oldq.left], newq);
  $('.clock_y').animate({
    top: newq[0],
    left: newq[1]
  }, speed, function () {
    animateDiv();
  });
};

// Verschiebe-Geschwindigkeit berechnen
function calcSpeed(prev, next) {
  var x = Math.abs(prev[1] - next[1]);
  var y = Math.abs(prev[0] - next[0]);
  var greatest = x > y ? x : y;
  var speedModifier = 0.001;
  var speed = Math.ceil(greatest / speedModifier);
  return speed;
};