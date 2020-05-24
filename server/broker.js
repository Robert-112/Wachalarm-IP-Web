module.exports = function(twit, uuidv4, app_cfg) {

  function alert_twitter_list(twitter_data, callback) {
   // tw.tw_screen_name, tw_consumer_key, tw.tw_consumer_secret, tw.tw_access_token_key, tw.tw_access_token_secret, we.uuid, we.einsatzart, wa.name_wache

console.log('twitter_data'+JSON.stringify(twitter_data));

    var T = new twit({
      consumer_key: twitter_data.tw_consumer_key,
      consumer_secret: twitter_data.tw_consumer_secret,
      access_token: twitter_data.tw_access_token_key,
      access_token_secret: twitter_data.tw_access_token_secret//,
      //timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
      //strictSSL:            true,     // optional - requires SSL certificates to be valid.
    })
    
      var params = {screen_name: twitter_data.tw_screen_name};
    T.get('lists/list', params, function(error, lists, response) {
      if (!error) {
        
        var list_obj = lists.filter(function(o){return o.name == twitter_data.list;} );
        //console.log(JSON.stringify(list_obj));
        console.log(list_obj[0].id_str);
        var member_params = {list_id: list_obj[0].id_str, count: 50};
        T.get('lists/members', member_params, function(error, members, response) {
          if (!error) {
            console.log(JSON.stringify(members));

            var arrayLength = members.users.length;
            for (var i = 0; i < arrayLength; i++) {
                console.log(members.users[i].screen_name);
                
                var tw_text = 'Neuer Einsatz für ' + twitter_data.name_wache +', bitte um Rückmeldung: https://wachalarm.info.tm/rmld/'+twitter_data.uuid+'/'+uuidv4();
                //Do something

                var msg_params = {event: {type: "message_create", message_create: {target: {recipient_id: members.users[i].id}, message_data: {text: tw_text}}}};
                T.post('direct_messages/events/new', msg_params, function(error, members, response) {
                  if (!error) {
                    console.log('OK');
                    callback && callback(members);
                  } else {
                    console.log(error);
                    callback && callback(null);
                  };
                });
            };
          } else {
            console.log(error);
            callback && callback(null);
          };
        });
      }  else {
        console.log(error);
        callback && callback(null);
      };
    });


  };

  return {
    alert_twitter_list: alert_twitter_list
  };
};
