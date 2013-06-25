var express = require('express');
var app = express();
var redis = require("redis"),
        client = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
var parserUtil = require('./parserUtil');

app.get('/:country/:category', function(req, res) {
  debugger;
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var tagKey = parserUtil.getTagKey(todayKey);
  client.smembers(tagKey, function(error, replies){
	console.log(replies);
	res.json(replies);
  });
  res.json("");
});

app.listen(process.env.PORT || 3000);
console.log('Listening on port 3000');
