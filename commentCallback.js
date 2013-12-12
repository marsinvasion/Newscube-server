var redis = require("redis"),
        client = redis.createClient(),
	clientSubscribe = redis.createClient();

var api_key = "key=AIzaSyBGXRFxGhf2OjAu6FXkJIq5Y7n54xGkIls";
client.on("error", function (err) {
        console.log("Redis Error " , err);
});

var request = require('request');

clientSubscribe.on("message", function (channel, message) {
  var json = JSON.parse(message);
  var key = json.accountName;
  var field = json.field;
  debugger;
  client.hget(key,field, function (err, regId){
    debugger;
    var regIds = [regId];
    if(err) throw err;
    var options = {
      url: 'https://android.googleapis.com/gcm/send',
      headers: {
	'User-Agent': 'request',
        'Authorization':api_key
      },
      json : {
        "data": {
	  "comment":"You have new replies"
        },
        "registration_ids": regIds	
      }
    };
    request.post(options, function(error, response, body){
	if(error) throw error;
	if(response.statusCode != 200)
  	  console.log(response.statusCode, body);
    });
  });

});

clientSubscribe.subscribe("comment channel");
