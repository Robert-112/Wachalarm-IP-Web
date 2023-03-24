module.exports = function (app_cfg, sql) {

  // Module laden
  const TelegramBot = require('node-telegram-bot-api');

  // Verweis auf den Telegram-Bot, der mithilfe von 'polling' neue Benutzeranfragen abruft
  const bot = new TelegramBot(app_cfg.telegram.token, { polling: true });
  bot.on('polling_error', err => log(err));
  bot.on('message', msg => sendStartMessage(msg, withUserInteraction = true)); // bei irgendwelchen Nachrichten mit dem Start-Dialog antworten
  bot.on('callback_query', onCallbackQuery); // Callback-Queries behandeln (bei Auswahl einer der gesendeten Antwortmöglichkeiten, die vorher als inline_keyboard verschickt wurden)
  log('Telegram-Bot gestartet');

  /**
   * Senden der Start-Narchricht (führt ein sendMessage durch)
   */
  function sendStartMessage(msg) {
    log('Nachricht in Chat ' + msg.chat.id);
    let text = (withUserInteraction) ? 'Ich kann dir helfen, Wachalarme in einen Telegram-Chat zu integrieren.\n\n' : '';

    // ermitteln, welche Wachalarme für diesen Chat schon hinterlegt sind
    sql.db_telegram_get_wachen_for_chat(msg.chat.id, function (data) {
      if (!data) {
        text += 'In diesem Chat sind momentan *noch keine Wachalarme* hinterlegt.';
      }
      else {
        text += 'In diesem Chat sind momentan folgende Wachalarme hinterlegt:'
        data.forEach(function (wache) {
          text += '\n  - *' + wache.wache_name + '*' + ((wache.wache_nr.toString().length < 6) ? ' (alle Wachen)' : '');
        });
      }

      if (!withUserInteraction) {
        bot.sendMessage(
          chatId = msg.chat.id,
          message = text,
          options = { parse_mode: 'Markdown' }
        ).catch(err => log(err));
      }
      else {
        // Nachricht mit Antwortmöglichkeiten versenden
        bot.sendMessage(
          chatId = msg.chat.id,
          message = text,
          options = {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{
                  text: 'Ich möchte diesem Chat einen neuen Wachalarm hinzufügen.',
                  callback_data: JSON.stringify({ action: 'add_alarm', nr: '' })
                }],
                [{
                  text: 'Ein vorhanderner Wachalarm soll wieder entfernt werden.',
                  callback_data: JSON.stringify({ action: 'remove_alarm' })
                }].slice((!data) ? 1 : 0), // falls es noch keine Alarme gibt, dieses Element auslassen
                [{
                  text: 'Wie kann ich den Benachrichtigungston für diesen Chat ändern?',
                  callback_data: JSON.stringify({ action: 'notification' })
                }],
                [{
                  text: 'Schick mir bitte einen Test-Alarm.',
                  callback_data: JSON.stringify({ action: 'test_alarm' })
                }],
                [{
                  text: 'Danke. Es gibt nix weiter zu tun.',
                  callback_data: JSON.stringify({ action: 'finish' })
                }]
              ],
              one_time_keyboard: true
            }
          }).catch(err => log(err));
      }
    });
  }

  /**
   * auf die Auswahl einer Antwortmöglichkeit (die vorher als inline_keyboard angeboten wurden) reagieren
   * (führt in der Regel ein editMessageText der Ursprungsnachricht durch)
   */
  function onCallbackQuery(callbackQuery) {
    log('Callback in Chat ' + callbackQuery.message.chat.id + ' (' + callbackQuery.data + ')');
    const msg = callbackQuery.message; // die Nachricht, deren Auswahlmöglichkeit gewählt wurde
    const callback_data = (callbackQuery.data) ? JSON.parse(callbackQuery.data) : {}; // die Callback-Daten deserialiseren
    let text = msg.text; // der (geänderte) Text der Nachricht

    /**
     * einen neuen Wachalarm hinzufügen
     */
    if (callback_data.action == 'add_alarm') {
      if (!callback_data.final) {
        switch (callback_data.nr.toString().length) {
          case 0: text = 'Super! Aus welchem Landkreis möchtest du denn Wachalarme erhalten?'; break;
          case 2: text = 'Alles klar! Wo genau in diesem Landkreis soll es denn sein?'; break;
          case 4: text = 'Perfekt! Von welcher *Wache* möchtest du denn Wachalarme erhalten?'; break;
        }

        // Auswahlmöglichkeiten anbieten: Kreise/Träger/Wachen
        sql.db_wache_get_all(function (data) {
          let inline_keyboard = [];
          data.forEach(function (wache) {
            // Antwortmöglichkeiten hierarchisch anzeigen: Erst Kreise, dann die Träger des ausgwählten Kreises und dann alle Wachen des ausgewählten Trägers
            if (wache.nr == callback_data.nr || (wache.nr.toString().startsWith(callback_data.nr) && wache.nr.toString().length == callback_data.nr.toString().length + 2)) {
              inline_keyboard.push([{
                text: (wache.nr == callback_data.nr) ? wache.name + ' (alle Wachen)' : wache.name,
                callback_data: JSON.stringify({ action: 'add_alarm', nr: wache.nr, final: (wache.typ == 'wache' || wache.nr == callback_data.nr) })
              }]);
            }
          });
          if (callback_data.nr.toString().length >= 2) {
            inline_keyboard.push([{
              text: '« zurück',
              callback_data: JSON.stringify({ action: 'add_alarm', nr: callback_data.nr.toString().slice(0, -2) })
            }]);
          }
          else {
            inline_keyboard.push([{
              text: '« abbrechen',
              callback_data: JSON.stringify({ action: 'restart', nr: callback_data.nr.toString().slice(0, -2) })
            }]);
          }

          bot.editMessageText(text, options = {
            chat_id: msg.chat.id, message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inline_keyboard, one_time_keyboard: true }
          }).catch(err => log(err));
        });
      }
      // Auswahl eines Wachalarms => in die Datenbank speichern
      else if (callback_data.nr) {
        sql.db_wache_vorhanden(callback_data.nr, function (wache) {
          if (wache) {
            sql.db_telegram_add_wache_to_chat(msg.chat.id, wache.nr, wache.name);
            log('Wachalarm ' + wache.name + ' (' + wache.nr + ') zu Chat ' + msg.chat.id + ' hinzugefügt.');

            let text = 'Du erhältst jetzt Wachalarme für *' + wache.name + '* (' + wache.nr + ')';
            bot.editMessageText(text, options = {
              chat_id: msg.chat.id, message_id: msg.message_id,
              parse_mode: 'Markdown'
            }).catch(err => log(err));

            sendStartMessage(msg, withUserInteraction = true);
          }
        });
      }
    }

    /**
     * einen vorhandenen Wachalarm wieder entfernen
     */
    if (callback_data.action == 'remove_alarm') {
      // Auswahlmöglichkeit: vorhandene Wachalarme des aktuellen Chats
      if (!callback_data.nr) {
        text = 'Okay. Welcher Wachalarm soll aus diesem Chat wieder entfernt werden?';
        sql.db_telegram_get_wachen_for_chat(msg.chat.id, function (data) {
          let inline_keyboard = [];
          data.forEach(function (wache) {
            inline_keyboard.push([{
              text: wache.wache_name + ' (' + wache.wache_nr + ')',
              callback_data: JSON.stringify({ action: 'remove_alarm', nr: wache.wache_nr })
            }]);
          });
          bot.editMessageText(text, options = {
            chat_id: msg.chat.id, message_id: msg.message_id,
            reply_markup: { inline_keyboard: inline_keyboard, one_time_keyboard: true }
          }).catch(err => log(err));
        });
      }
      // Auswahl eines Wachalarms => aus der Datenbank entfernen
      else {
        sql.db_wache_vorhanden(callback_data.nr, function (wache) {
          if (wache) {
            sql.db_telegram_remove_wache_from_chat(msg.chat.id, wache.nr, wache.name);
            log('Wachalarm ' + wache.name + ' (' + wache.nr + ') aus Chat ' + msg.chat.id + ' entfernt.');

            let text = 'Du erhältst jetzt *keine* Wachalarme mehr für *' + wache.name + '* (' + wache.nr + ')';
            bot.editMessageText(text, options = {
              chat_id: msg.chat.id, message_id: msg.message_id,
              parse_mode: 'Markdown'
            }).catch(err => log(err));

            sendStartMessage(msg, withUserInteraction = true);
          }
        });
      }
    }

    /**
     * einen Testalarm verschicken
     */
    if (callback_data.action == 'test_alarm') {
      // Auswahlmöglichkeiten: Sekunden, bis der Testalarm verschickt wird
      if (!callback_data.duration) {
        text = 'Na klar! Wann möchtest du den Test-Alarm erhalten?';
        let inline_keyboard = [[]];
        [3, 10, 30].forEach(sec => inline_keyboard[0].push({
          text: 'In ' + sec + ' Sekunden',
          callback_data: JSON.stringify({ action: 'test_alarm', duration: sec })
        }));
        bot.editMessageText(text, options = {
          chat_id: msg.chat.id, message_id: msg.message_id,
          reply_markup: { inline_keyboard: inline_keyboard, one_time_keyboard: true }
        }).catch(err => log(err));
      }
      // Auswahl einer Zeit => Versenden des Testalarms planen
      else {
        new Promise(resolve => setTimeout(resolve, callback_data.duration * 1000))
          .then(function () {
            text = formatAlarm({ "einsatzdaten": { "nummer": "0815", "alarmzeit": new Date().toLocaleString('de-DE'), "art": "Sonstiges", "stichwort": "S:Testeinsatz", "sondersignal": 1, "besonderheiten": "DEMO Wachalarm-IP-Web - Testeinsatz", "patient": "" }, "ortsdaten": { "ort": "Elsterwerda", "ortsteil": "Biehla", "strasse": "Haidaer Str. 47A", "objekt": "", "objektnr": "-1", "objektart": "", "wachfolge": "611302", "wgs84_x": "52.471244", "wgs84_y": "13.502943" }, "alarmdaten": [{ "typ": "ALARM", "netzadresse": "", "wachenname": "EE FW Elsterwerda", "einsatzmittel": "FL EE 02/14-01", "zeit_a": "18:41", "zeit_b": "", "zeit_c": "" }] });
            bot.sendMessage(msg.chat.id, text).catch(err => log(err));
            log('Test-Alarm an Chat ' + msg.chat.id + ' gesendet.');
            bot.deleteMessage(msg.chat.id, msg.message_id).catch(err => log(err));
          });
        log('Test-Alarm an Chat ' + msg.chat.id + ' in ' + callback_data.duration + 'sec geplant.');
        bot.editMessageText('Geht klar! Ein *Testalarm* kommt in ' + callback_data.duration + ' Sekunden...', options = {
          chat_id: msg.chat.id, message_id: msg.message_id,
          parse_mode: 'Markdown'
        }).catch(err => log(err));
      }
    }

    /**
    * Hinweistext, wie man den Benachrichtigungston dieses Chats ändert
    */
    if (callback_data.action == 'notification') {
      text = 'Für jeden Chat können Benachrichtigungen (z.B. Alarmierungstöne und Wichtigkeit) individuell eingestellt werden. \n' +
        '\n' +
        '1. Klicke oben rechts auf das `Symbol mit den drei Punkten`.\n' +
        '2. Wähle `Stumm` aus.\n' +
        '3. Klicke auf `Anpassen`.\n' +
        '4. Unter `Ton` kannst du einen Systemton auswählen oder einen `Ton hochladen`\n' +
        '\n' +
        'Spezielle *SMS-Alarmierungstöne* kannst du beispielsweise unter https://www.regan.ch/sms-alarmierungstoene/ oder https://safereach.com/de/wissen/10-alarmtoene-die-sie-garantiert-nicht-ueberhoren/ herunterladen und dann als Benachrichtigungston für den Chat verwenden.\n' +
        '\n' +
        'Soll ich dir einen *Test-Alarm* senden?';
      bot.editMessageText(text, 
        options = {
        chat_id: msg.chat.id, message_id: msg.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{
              text: 'Ja, gerne.',
              callback_data: JSON.stringify({ action: 'test_alarm' })
            },
            {
              text: 'Nein, danke.',
              callback_data: JSON.stringify({ action: 'finish' })
            }]
          ],
          one_time_keyboard: true
      }}).catch(err => log(err));
    }

    /**
     * von vorn beginnen
     */
    if (callback_data.action == 'restart') {
      bot.deleteMessage(msg.chat.id, msg.message_id).catch(err => log(err));
      sendStartMessage(msg, withUserInteraction = true).catch(err => log(err));
    }

    /**
     * beenden des Dialogs
     */
    if (callback_data.action == 'finish') {
      bot.deleteMessage(msg.chat.id, msg.message_id).catch(err => log(err));
      sendStartMessage(msg, withUserInteraction = false).catch(err => log(err));
    }
  }

  /**
   * aus einem Alarm eine Textnachricht erstellen
   */
  function formatAlarm(alarm) {
    // Symbol für Sondersignal am beginn anfügen
    let text = (alarm.einsatzdaten.sondersignal) ? '\u{1F6A8}' /*Unicode Character 'POLICE CARS REVOLVING LIGHT' (U+1F6A8)*/ : '\u{1F515}' /*Unicode Character 'BELL WITH CANCELLATION STROKE' (U+1F515)*/;

    text += ' ' + alarm.einsatzdaten.alarmzeit; // Datum und Uhrzeit anfügen
    text += ' ' + alarm.einsatzdaten.stichwort; // Stichwort anfügen
    text += ' \u{1F310} '; // Symbol für Orte anfügen Unicode Character 'GLOBE WITH MERIDIANS' (U+1F310)
    text += alarm.ortsdaten.ort + ((alarm.ortsdaten.ortsteil) ? ', ' + alarm.ortsdaten.ortsteil : ''); // Ort und Ortsteil anfügen

    if (alarm.alarmdaten) {
      // Wachen, Unicode Character 'FIRE ENGINE' (U+1F692) and 'RIGHTWARDS WHITE ARROW' (U+21E8)
      text += ' \u{1F692} \u{21E8} ';
      alarm.alarmdaten.forEach(alarmdatum => {
        if (!text.includes(alarmdatum.wachenname)) {
          text += alarmdatum.wachenname + ', '; // Namen aller beteiligten Wachen anfügen
        }
      });
      text = text.slice(0, -2);
    }

    return text;
  }

  /**
   * Speichern von Log-Meldungen
   */
  function log(data) {
    sql.db_log('Telegram', (typeof data === 'string') ? data : JSON.stringify(data));
  }

  return {
    bot: bot,
    formatAlarm: formatAlarm
  }
}