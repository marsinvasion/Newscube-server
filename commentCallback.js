var redis = require("redis"),
        client = redis.createClient(),
	clientSubscribe = redis.createClient();

var api_key = "key=AIzaSyA4UvNtqQJUm39S-ELIJYPN0fj-CU4BY0Y";
client.on("error", function (err) {
        console.log("Redis Error " , err);
});

var request = require('request');

clientSubscribe.on("message", function (channel, message) {
  var json = JSON.parse(message);
  var headId = json.headId;
  var commentId = json.commentId;
  client.hget(headId+":comment", "accountName", function (err, accountName){
  if(err) throw err;
  if(accountName){
  client.smembers(accountName+":registeredIds", function (err, regIds){
    debugger;
    if(err) throw err;
    client.hgetall(commentId+":comment", function (err, res){
      if(err) throw err;
      var comment = res.comment;
      var displayName = res.displayName;
      var options = {
        url: 'https://android.googleapis.com/gcm/send',
        headers: {
	  'User-Agent': 'request',
          'Authorization':api_key
        },
        json : {
          "data": {
	    "display": displayName +" replied",
	    "commentId": commentId,
	    "comment": comment
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
  }
  });

});

clientSubscribe.subscribe("comment channel");
console.log("starting comment channel worker");
