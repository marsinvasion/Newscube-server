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

  client.smembers(tagKey, function(err, tags){
	console.log(tags);
	var json = [];
	async.each(tags, function(tag, callback){
	  var obj = getResponse(tag, tagKey);
          json.push(obj);
	}, function(err){
	  if(err) throw err;
	  res.json(json);
  	});
});

var getResponse = function(tag, tagKey){
	client.get(tagKey+":"+tag+":count", function(error, reply){
	  debugger;
	  var obj = {};
          obj.tag = tag;
          obj.count = reply;
	  return obj;
	});
}

app.listen(process.env.PORT || 3000);
console.log('Listening on port 3000');
