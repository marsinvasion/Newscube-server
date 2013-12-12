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
  var key = json.key;
  var data = json.data;
  debugger;
  client.smembers(key, function (err, regIds){
    debugger;
    if(err) throw err;
    var options = {
      url: 'https://android.googleapis.com/gcm/send',
      headers: {
	'User-Agent': 'request',
        'Authorization':api_key
      },
      json : {
        "data": {
	  "comment":data
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
