// TODO: Remote-Reload per Socket
// TODO: Client-Server-Version abgleichen
// TODO: Modal bei Chrome, dass Audio erst bei interaktion aktiv

$(document).ready(function() {
  set_clock();
});

$(window).on("resize", function() {
  resize_text();
});

$('#replay').on('click', function(event) {
  audio.play();
});

/* ############################ */
/* ####### TEXT-RESIZE ######## */
/* ############################ */

// Textgröße dynamisch anpassen, Hintergrundfarbe ggf. anpassen
function resize_text() {
  // Uhr-Text nur Anpassen wenn sichtbar
  if ($('#waipclock').is(':visible')) {
    textFit(document.getElementsByClassName('tf_clock'), {
      minFontSize: 3,
      maxFontSize: 500
    });
    $("body").css("background-color", "#000");
  };
  // Tableau-Text nur Anpassen wenn sichtbar
  if ($('#waiptableau').is(':visible')) {
    textFit(document.getElementsByClassName('tf_singleline'), {
      minFontSize: 1,
      maxFontSize: 500
    });
    textFit(document.getElementsByClassName('tf_multiline'), {
      detectMultiLine: false
    });
    textFit(document.getElementsByClassName('tf_test'), {
      widthOnly: true,
      alignHoriz: false,
      alignVert: false,
      alignVertWithFlexbox: false
    });
    map.invalidateSize();
    $("body").css("background-color", "#222");
  };
};

/* ############################ */
/* ####### INAKTIVITAET ####### */
/* ############################ */

var timeoutID;

// Inactivitaet auswerten
function setup_inactivcheck() {
  this.addEventListener("mousemove", resetActivTimer, false);
  this.addEventListener("mousedown", resetActivTimer, false);
  this.addEventListener("keypress", resetActivTimer, false);
  this.addEventListener("DOMMouseScroll", resetActivTimer, false);
  this.addEventListener("mousewheel", resetActivTimer, {
    passive: true
  }, false);
  this.addEventListener("touchmove", resetActivTimer, false);
  this.addEventListener("MSPointerMove", resetActivTimer, false);
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
  $(".navbar").fadeOut("slow");
  $(".footer").fadeOut("slow");
  $(".fullheight").css({
    height: 'calc(100vh - 2rem)'
  });
  $("body").css({
    paddingTop: "1rem",
    margin: 0
  });
  resize_text();
};

// bei Activitaet Header/Footer einblenden
function do_on_Active() {
  start_inactivtimer();
  // do something
  $(".navbar").fadeIn('slow');
  $(".footer").fadeIn('slow');
  $("body").css({
    marginBottom: '60px',
    paddingTop: '5rem',
    paddingBottom: '0'
  });
  $(".fullheight").css({
    height: 'calc(100vh - 60px - 5rem)'
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

  var start = new Date(t1[0], t1[1]-1, t1[2], t1[3], t1[4], t1[5]),
      end   = new Date(t2[0], t2[1]-1, t2[2], t2[3], t2[4], t2[5]);

  clearInterval(counter_ID);
  counter_ID = setInterval(function(){ do_progressbar(start, end); }, 1000);
};

function do_progressbar(start, end) {
  today = new Date();
  // restliche Zeit ermitteln
  var current_progress = Math.round(100 / (end.getTime() - start.getTime()) * (end.getTime() - today.getTime()));

  var diff = Math.abs(end - today);
  var minutesDifference = Math.floor(diff/1000/60);
  diff -= minutesDifference*1000*60;
  var secondsDifference = Math.floor(diff/1000);
  if (secondsDifference <= 9) {
    secondsDifference = '0' + secondsDifference;
  };
  var minutes = minutesDifference + ':' + secondsDifference;
  // Progressbar anpassen
  $("#hilfsfrist")
    .css("width", current_progress + "%")
    .attr("aria-valuenow", current_progress)
    .text(minutes + " min");
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

/* ########################### */
/* ######## SOCKET.IO ######## */
/* ########################### */

// Websocket
var socket = io.connect();

// Wachen-ID bei Connect an Server senden
socket.on('connect', function() {
  socket.emit('wachen_id', wachen_id);
  $('#waipModal').modal('hide');
});

socket.on('connect_error', function(err) {
  $('#waipModalTitle').html('FEHLER');
  $('#waipModalBody').html('Verbindung zum Server getrennt!');
  $('#waipModal').modal('show');
});

// ID von Server und Client vergleichen, falls ungleich -> Seite neu laden
socket.on('io.version', function(server_id) {
  // TODO: socket.emit(lade client xxx neu)
  if (client_id != server_id) {
    $('#waipModalTitle').html('ACHTUNG');
    $('#waipModalBody').html('Neue Server-Version. Seite wird in 10 Sekunden neu geladen!');
    if ($('#waipModal').hasClass('in')) {
      $('#waipModal').modal('hide');
    };
    $('#waipModal').modal('show');
    setTimeout(function() {
      location.reload();
    }, 10000);
  };
});

// ggf. Fehler ausgeben
socket.on('io.error', function(data) {
  console.log('Error:', data);
});

// Sounds stoppen
socket.on('io.stopaudio', function(data) {
  var audio = document.getElementById('audio');
  audio.pause;
});

// Sounds abspielen
socket.on('io.playtts', function(data) {
  var audio = document.getElementById('audio');
  audio.src = (data);
  // Audio-Blockade des Browsers erkennen
  var promise = document.querySelector('audio').play();
  if (promise !== undefined) {
    promise.then(_ => {
      audio.play();
    }).catch(error => {
      $('#waipModalTitle').html('Audio-Fehler');
      $('#waipModalBody').html('Die automatische Audio-Wiedergabe wird durch Ihren Browser blockiert! Fehlermeldung: ' + error.message);
      $('#waipModal').modal('show');
    });
  };
});

// Daten löschen, Uhr anzeigen
socket.on('io.standby', function(data) {
  // TODO: Wenn vorhanden, hier #hilfsfrist zurücksetzen
  $('#einsatz_art').removeClass(function(index, className) {
    return (className.match(/(^|\s)bg-\S+/g) || []).join(' ');
  });
  $('#einsatz_stichwort').removeClass();
  $('#einsatz_stichwort').html('');
  $('#sondersignal').removeClass();
  $('#ortsdaten').html('');
  $('#besonderheiten').html('');
  $('#em_alarmiert').empty();
  $('#em_weitere').html('');
  map.setView(new L.LatLng(0, 0), 14);
  // Tableau ausblenden
  $("#waiptableau").addClass("d-none");
  $("#waipclock").removeClass("d-none");
  // Text anpassen
  resize_text();
});

// Einsatzdaten laden, Wachalarm anzeigen
socket.on('io.neuerEinsatz', function(data) {
  // DEBUG
  console.log(data);
  // Hintergrund der Einsatzart zunächst entfernen
  $('#einsatz_art').removeClass(function(index, className) {
    return (className.match(/(^|\s)bg-\S+/g) || []).join(' ');
  });
  // Icon der Einsatzart enfernen
  $('#einsatz_stichwort').removeClass();
  // Rückmeldung ausblenden
  $('#rueckmeldung').addClass("d-none");
  // Art und Stichwort festlegen hinterlegen
  switch (data.einsatzart) {
    case 'Brandeinsatz':
      $('#einsatz_art').addClass("bg-danger");
      $('#einsatz_stichwort').addClass("ion-md-flame");
      $('#rueckmeldung').removeClass("d-none");
      break;
    case 'Hilfeleistungseinsatz':
      $('#einsatz_art').addClass("bg-info");
      $('#einsatz_stichwort').addClass("ion-md-construct");
      $('#rueckmeldung').removeClass("d-none");
      break;
    case 'Rettungseinsatz':
      $('#einsatz_art').addClass("bg-warning");
      $('#einsatz_stichwort').addClass("ion-md-medkit");
      break;
    case 'Krankentransport':
      $('#einsatz_art').addClass("bg-success");
      $('#einsatz_stichwort').addClass("ion-md-medical");
      break;
    default:
      $('#einsatz_art').addClass("bg-secondary");
      $('#einsatz_stichwort').addClass("ion-md-information-circle");
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
    small_ortsdaten = small_ortsdaten + data.objekt + '<br>';
  };
  if (data.ort) {
    small_ortsdaten = small_ortsdaten + data.ort + '<br>';
  };
  if (data.ortsteil) {
    small_ortsdaten = small_ortsdaten + data.ortsteil + '<br>';
  };
  if (data.strasse) {
    small_ortsdaten = small_ortsdaten + data.strasse + '<br>';
  };
  if (small_ortsdaten.substr(small_ortsdaten.length - 4) == '<br>') {
    small_ortsdaten = small_ortsdaten.slice(0, -4);
  };
  $('#ortsdaten').html(small_ortsdaten);
  // Besonderheiten setzen
  $('#besonderheiten').html(data.besonderheiten);
  // alarmierte Einsatzmittel setzen
  $('#em_alarmiert').empty();
  var data_em_alarmiert = JSON.parse(data.em_alarmiert);
  for (var i in data_em_alarmiert) {
    $('#em_alarmiert').append('<li class="list-group-item d-flex justify-content-between align-items-center">' + data_em_alarmiert[i].name + '</li>');
  };
  // weitere alarmierte Einsatzmittel setzen
  $('#em_weitere').html('');
  var data_em_weitere = JSON.parse(data.em_weitere);
  if (data_em_weitere == null) {
    // TODO: Einzeige vergrößern (-.h-5) wenn keine weiteren Einsatzmittel beteiligt
  } else {
    var tmp;
    for (var i in data_em_weitere) {
      if (tmp) {
        tmp = tmp + ', ' + data_em_weitere[i].name;
      } else {
        tmp = data_em_weitere[i].name;
      };
    };
    $('#em_weitere').html(tmp);
  };
  // Karte setzen
  map.removeLayer(marker);
  marker = L.marker(new L.LatLng(data.wgs84_x, data.wgs84_y), {
    icon: redIcon
  }).addTo(map);
  map.setView(new L.LatLng(data.wgs84_x, data.wgs84_y), 14);
  // Hilfsfrist setzen
  start_counter(data.zeitstempel, data.ablaufzeit);
  //var intervalid;
  //createInterval(countdown, intervalid, data.zeitstempel, data.ablaufzeit, 1000);
  // Uhr ausblenden
  $("#waipclock").addClass("d-none");
  $("#waiptableau").removeClass("d-none");
  // Text anpassen
  resize_text();
});

/* ########################### */
/* ####### SCREENSAVER ####### */
/* ########################### */

// Uhrzeit und Datum für Bildschirmschoner
function set_clock() {
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
  var curr_month = d.getMonth();
  var curr_year = d.getFullYear();
  var element_time = curr_hour + ':' + curr_min;
  var element_day = d_names[curr_day] + ', ' + curr_date + '. ' + m_names[curr_month];
  var element_date_time = curr_date + '.' + curr_month_id + '.' + curr_year + ' - ' + element_time;
  // nur erneuern wenn sich Zeit geändert hat
  if (document.getElementById('time').textContent !== element_time) {
    // Uhrzeit anzeigen
    document.getElementById('time').innerHTML = element_time;
    // Datum (Text) anzeigen
    document.getElementById('day').innerHTML = element_day;
    // Datum anzeigen, sofern sichtbar
    document.getElementById('date-time').innerHTML = element_date_time;
    // Textgröße neu setzen
    resize_text();
  };
};

// Uhrzeit jede Sekunden anpassen
setInterval(set_clock, 1000);

/* ########################### */
/* ######## SONSTIGES ######## */
/* ########################### */

$('#rueckmeldung a').on('click', function (e) {
  //$('#waipModalTitle').html('Rückmeldung');
  //$('#waipModalBody').html('Ich melde mich als: BUTTON(EK, MA, AGT, FK)');
  $('#responseModal').modal('show');
})
