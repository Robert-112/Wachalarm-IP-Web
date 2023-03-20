module.exports = function (app_cfg, sql) {

  // Module laden
  const TelegramBot = require('node-telegram-bot-api');

  // Verweis auf den Telegram-Bot, der mithilfe von 'polling' neue Benutzeranfragen abruft
  const bot = new TelegramBot(app_cfg.telegram.token, { polling: true });

  bot.on('message', msg => sendStartMessage(msg)); // bei irgendwelchen Nachrichten mit dem Start-Dialog antworten
  bot.on('callback_query', onCallbackQuery); // Callback queries behandeln

  function sendStartMessage(msg) {
    let text = 'Hallo ' + msg.from.first_name + '! Ich kann dir helfen, Wachalarme in einen Telegram-Chat zu integrieren.\n\n';
    
    sql.db_telegram_get_wachen(msg.chat.id, function (data) {
      if (!data) {
        text += "Du hast momentan noch keine Wachalarme für diesen Chat hinterlegt.";
      }
      else {
        text += "Du hast momentan folgende Wachalarme für diesen Chat hinterlegt:"
        data.forEach(function (wache) {
          text += "\n  - *" + wache.waip_wache_name + "* (" + wache.waip_wache_nr + ")";
        });
      }

      text += "\n\nWas kann ich für dich tun?"
      
      bot.sendMessage(
        chatId = msg.chat.id,
        message = text,
        options = {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{
                text: 'Ich möchte diesem Chat einen neuen Wachalarm hinzufügen.',
                callback_data: JSON.stringify({ action: "add_alarm" })
              }],
              [{
                text: 'Ich möchte einen der Wachalarme aus diesem Chat entfernen.',
                callback_data: JSON.stringify({ action: "remove_alarm" })
              }]
                .slice(end = (!data) ? 1 : 0) // falls es noch keine Alarme gibt, nur die erste Auswahl zurückgeben
            ],
            one_time_keyboard: true
          }
        });
    });
  }

  function onCallbackQuery(callbackQuery) {
    const msg = callbackQuery.message;
    const callback_data = JSON.parse(callbackQuery.data);
    let text = msg.text;

    if (callback_data.action == "add_alarm") {
      if (!callback_data.typ && !callback_data.nr) {
        bot.editMessageText('Klasse! Welche Wachalarme möchtest du denn erhalten?',
          options = {
            chat_id: msg.chat.id, message_id: msg.message_id,
            reply_markup: {
              inline_keyboard: [
                [{
                  text: 'Zeige den Wachalarm einer einzelnen Wache (z.B. Feuerwache, Rettungswache etc.) an.',
                  callback_data: JSON.stringify({ action: "add_alarm", typ: "wache" })
                }],
                [{
                  text: 'Zeige alle Wachalarme der Wachen eines Trägers (Amt, amtsfreie Gemeinde, Stadt) an.',
                  callback_data: JSON.stringify({ action: "add_alarm", typ: "traeger" })
                }],
                [{
                  text: 'Zeige alle Wachalarme des gesamten Kreises (egal ob für Feuerwehr oder Rettungsdienst) an.',
                  callback_data: JSON.stringify({
                    action: "add_alarm", typ: "kreis"
                  })
                }]
              ],
              one_time_keyboard: true
            }
          });
      }
      else if (callback_data.typ) {
        text = "Super! Welchen Wachalarm möchtest du genau erhalten?";
        sql.db_wache_get_all(function (data) {
          let inline_keyboard = [];
          data.forEach(function (wache) {
            if (wache.typ == callback_data.typ && wache.nr) {
              inline_keyboard.push([{
                text: wache.name,
                callback_data: JSON.stringify({ action: "add_alarm", nr: wache.nr })
              }]);
            }
          });

          bot.editMessageText(text, options = {
            chat_id: msg.chat.id, message_id: msg.message_id,
            reply_markup: { inline_keyboard: inline_keyboard, one_time_keyboard: true }
          });
        });
      }
      else if (callback_data.nr) {
        sql.db_wache_vorhanden(callback_data.nr, function (wache) {
          if (wache) {
            sql.db_telegram_add_chat(msg.chat.id, wache.nr, wache.name);

            let text = "Du erhältst jetzt Wachalarme für *" + wache.name + "* (" + wache.nr + ")";
            bot.editMessageText(text, options = {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              parse_mode: 'Markdown'
            });
            
            text += "\n\nWas kann ich für dich tun?"
          }
        });
      }
    }

    if (callback_data.action == "remove_alarm") {
      if (!callback_data.nr) {
        text = "Okay. Welcher Wachalarm soll aus diesem Chat wieder entfernt werden?";
        sql.db_telegram_get_wachen(msg.chat.id, function (data) {
          let inline_keyboard = [];
          data.forEach(function (wache) {
            inline_keyboard.push([{
              text: wache.waip_wache_name + " (" + wache.waip_wache_nr +")",
              callback_data: JSON.stringify({ action: "remove_alarm", nr: wache.waip_wache_nr })
            }]);
          });
          bot.editMessageText(text, options = {
            chat_id: msg.chat.id, message_id: msg.message_id,
            reply_markup: { inline_keyboard: inline_keyboard, one_time_keyboard: true }
          });
        });
      }
      else {
        sql.db_wache_vorhanden(callback_data.nr, function (wache) {
          if (wache) {
            sql.db_telegram_remove_chat(msg.chat.id, wache.nr, wache.name);
            
            let text = "Du erhältst jetzt *keine* Wachalarme mehr für *" + wache.name + "* (" + wache.nr + ")";
            bot.editMessageText(text, options = {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              parse_mode: 'Markdown'
            });
          }
        });
      }
    }
  }
}