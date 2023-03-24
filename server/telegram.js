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
        text += "In diesem Chat sind momentan *noch keine Wachalarme* hinterlegt.";
      }
      else {
        text += "In diesem Chat sind momentan folgende Wachalarme hinterlegt:"
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
                callback_data: JSON.stringify({ action: "add_alarm", nr: "" })
              }],
              [{
                text: 'Ein vorhanderner Wachalarm soll wieder entfernt werden.',
                callback_data: JSON.stringify({ action: "remove_alarm" })
              }].slice((!data) ? 1 : 0), // falls es noch keine Alarme gibt, dieses Element auslassen
              [{
                text: 'Danke. Es gibt nix weiter zu tun.',
                callback_data: JSON.stringify({ action: "finish", nr: "" })
              }]
            ],
            one_time_keyboard: true
          }
        });
    });
  }

  function onCallbackQuery(callbackQuery) {
    const msg = callbackQuery.message;
    const callback_data = (callbackQuery.data) ? JSON.parse(callbackQuery.data) : {};
    let text = msg.text;

    if (callback_data.action == "add_alarm") {
      if (!callback_data.final) {
        switch (callback_data.nr.toString().length)
        {
          case 0: text = "Super! Aus welchem Landkreis möchtest du denn Wachalarme erhalten?"; break;
          case 2: text = "Alles klar! Wo genau in diesem Landkreis soll es denn sein?"; break;
          case 4: text = "Perfekt! Von welcher *Wache* möchtest du denn Wachalarme erhalten?"; break;
        }

        sql.db_wache_get_all(function (data) {
          let inline_keyboard = [];
          data.forEach(function (wache) {
            if (wache.nr == callback_data.nr || (wache.nr.toString().startsWith(callback_data.nr) && wache.nr.toString().length == callback_data.nr.toString().length + 2)) {
              inline_keyboard.push([{
                text: (wache.nr == callback_data.nr) ? wache.name + " (alle Wachen)" : wache.name,
                callback_data: JSON.stringify({ action: "add_alarm", nr: wache.nr, final: (wache.typ == 'wache' || wache.nr == callback_data.nr) })
              }]);
            }
          });
          if (callback_data.nr.toString().length >= 2) {
            inline_keyboard.push([{
              text: "« zurück",
              callback_data: JSON.stringify({ action: "add_alarm", nr: callback_data.nr.toString().slice(0, -2) })
            }]);
          }
          else {
            inline_keyboard.push([{
              text: "« abbrechen",
              callback_data: JSON.stringify({ action: "restart", nr: callback_data.nr.toString().slice(0, -2) })
            }]);
          }

          bot.editMessageText(text, options = {
            chat_id: msg.chat.id, message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inline_keyboard, one_time_keyboard: true }
          });
        });
      }
      else if (callback_data.nr) {
        sql.db_wache_vorhanden(callback_data.nr, function (wache) {
          if (wache) {
            sql.db_telegram_add_chat(msg.chat.id, wache.nr, wache.name);

            let text = "Erledigt. Du erhältst jetzt Wachalarme für *" + wache.name + "* (" + wache.nr + ")";
            bot.editMessageText(text, options = {
              chat_id: msg.chat.id, message_id: msg.message_id,
              parse_mode: 'Markdown'
            });
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
              text: wache.waip_wache_name + " (" + wache.waip_wache_nr + ")",
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

            let text = "Erledigt. Du erhältst jetzt *keine* Wachalarme mehr für *" + wache.name + "* (" + wache.nr + ")";
            bot.editMessageText(text, options = {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              parse_mode: 'Markdown'
            });
          }
        });
      }
    }

    if (callback_data.action == "restart") {
      bot.deleteMessage(msg.chat.id, msg.message_id);
      sendStartMessage(msg);
    }
  }
}