module.exports = function (app_cfg, sql, uuidv4) {

  // Module laden
  const twit = require('twit');

  function alert_vmtl_list(list_data, callback) {

    // waip_wachen_id, vmlt_typ, vmlt_account_name, vmtl_account_group, waip_id
    if (app_cfg.global.development) {
      console.log('Liste Vermittlung: ' + JSON.stringify(list_data));
    };

    if (list_data.vmtl_typ == 'twitter') {
      // wenn es sich um eine Twitter-Liste/Gruppe handelt, Account-Zugangsdaten ermitteln
      sql.db_vmtl_get_tw_account(list_data, function (vmtl_data) {

        // vmtl_data: tw_screen_name, tw_consumer_key, tw_consumer_secret, tw_access_token_key, tw_access_token_secret, uuid, einsatzart, name_wache
        if (app_cfg.global.development) {
          console.log('Twitter-Account-Daten: ' + JSON.stringify(vmtl_data));
        };

        if (vmtl_data) {
          // Prüfen ob zuletzt bereits eine Nachricht gesendet wurde (Doppelalarmierung vermeiden)
          sql.db_vmtl_check_history(vmtl_data, list_data, function (exists) {
            if (!exists) {
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
                  // mit List_id die Mitglieder der Liste auslesen
                  T.get('lists/members', member_params, function (error, members, response) {
                    if (!error) {
                      if (app_cfg.global.development) {
                        console.log('Mitglieder der Twitter-Liste: ' + JSON.stringify(members));
                      };
                      // an jedes Mitglied der Liste eine Meldung senden
                      var arrayLength = members.users.length;
                      for (var i = 0; i < arrayLength; i++) {
                        // Mitteilungstext festelgen
                        var tw_text = String.fromCodePoint(0x1F4DF) + ' ' + String.fromCodePoint(0x1F6A8) + String.fromCodePoint(0x0A) +
                          'Einsatz für ' + vmtl_data.name_wache + ' ' + String.fromCodePoint(0x27A1) + ' ' + vmtl_data.einsatzart + ', ' + vmtl_data.stichwort + String.fromCodePoint(0x0A) +
                          'jetzt Rückmeldung senden: ' + app_cfg.public.url + '/rmld/' + vmtl_data.uuid + '/' + uuidv4();
                        // Parameter der Mitteilung
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
                        // Mitteilung senden
                        T.post('direct_messages/events/new', msg_params, function (error, members, response) {
                          if (!error) {
                            sql.db_log('VMTL', 'Einsatz-Link gesendet: ' + JSON.stringify(members));
                            callback && callback(vmtl_data.list);
                          } else {
                            sql.db_log('VMTL', 'Fehler beim senden eines Einsatz-Links: ' + error);
                          };
                        });
                      };
                    } else {
                      sql.db_log('VMTL', 'Fehler beim lesen der Mitglieder der Twitter-Liste: ' + error);
                      callback && callback(null);
                    };
                  });
                } else {
                  sql.db_log('VMTL', 'Fehler beim lesen der Twitter-Liste: ' + error);
                  callback && callback(null);
                };
              });
            } else {
              sql.db_log('VMTL', 'Rückmeldungs-Link für Twitter-Account ' + list_data.vmtl_account_name + ' bereits zuvor gesendet. Wird verworfen.');
            };
          });

        } else {
          sql.db_log('VMTL', 'Zugangsdaten für Twitter-Account ' + list_data.vmtl_account_name + ' konnten nicht ermittelt werden.');
        };

      });
  } else {
    // andere Listen/Gruppen/Schnittstellen koennten hier noch abgefragt werden
    callback && callback(null);
  };

};

return {
  alert_vmtl_list: alert_vmtl_list
};
};