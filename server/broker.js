module.exports = function (uuidv4, sql) {

  // Module laden
  const twit = require('twit');

  function alert_vmtl_list(vmtl_data, callback) {

    // vmtl_data: tw.tw_screen_name, tw_consumer_key, tw.tw_consumer_secret, tw.tw_access_token_key, tw.tw_access_token_secret, we.uuid, we.einsatzart, wa.name_wache
    if (app_cfg.global.development) {
      console.log('Daten Vermittlung: ' + JSON.stringify(vmtl_data));
    };  
  
    var T = new twit({
      consumer_key: vmtl_data.tw_consumer_key,
      consumer_secret: vmtl_data.tw_consumer_secret,
      access_token: vmtl_data.tw_access_token_key,
      access_token_secret: vmtl_data.tw_access_token_secret
    })

    var params = {
      screen_name: vmtl_data.tw_screen_name
    };

    // Twitter-Liste beschicken
    T.get('lists/list', params, function (error, lists, response) {
      if (!error) {
        var list_obj = lists.filter(function (o) {
          return o.name == vmtl_data.list;
        });
        var member_params = {
          list_id: list_obj[0].id_str,
          count: 50
        };
        T.get('lists/members', member_params, function (error, members, response) {
          if (!error) {
            if (app_cfg.global.development) {
              console.log('Mitglieder der Twitter-Liste: ' + JSON.stringify(members));
            };  
            // an jedes Mitglied der Liste eine Meldung senden
            var arrayLength = members.users.length;
            for (var i = 0; i < arrayLength; i++) {
           
              var tw_text = String.fromCodePoint(0x1F4DF) + ' ' + vmtl_data.einsatzart + ' für ' + vmtl_data.name_wache + ', bitte um Rückmeldung: ' app_cfg.public.url + '/rmld/' + vmtl_data.uuid + '/' + uuidv4();
              
              
              //Do something

              var msg_params = {
                event: {
                  type: "message_create",
                  message_create: {
                    target: {
                      recipient_id: members.users[i].id
                    },
                    message_data: {
                      text: tw_text
                    }
                  }
                }
              };
              T.post('direct_messages/events/new', msg_params, function (error, members, response) {
                if (!error) {
                  console.log('OK');
                  console.log(members.users[i].screen_name);
                  sql.db_log('VMTL', 'Fehler beim lesen der Twitter-Liste: ' + error);
                  callback && callback(members);
                } else {
                  console.log(error);
                  callback && callback(null);
                };
              });
            };
          } else {
            sql.db_log('VMTL', 'Fehler beim lesen der Mitglieder der Twitter-Liste: ' + error);
            callback && callback(null);
          };
        });
      } else {
        console.log(error);
        sql.db_log('VMTL', 'Fehler beim lesen der Twitter-Liste: ' + error);
        callback && callback(null);
      };
    });
  };

  return {
    alert_vmtl_list: alert_vmtl_list
  };
};