var express = require('express');
var app = express();
var redis = require("redis"),
        client = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
var parserUtil = require('./parserUtil');
var async = require('async');
app.get('/:country/:category', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var tagKey = parserUtil.getTagKey(todayKey);

  client.smembers(tagKey, function(err, tags){
	console.log(tags);
	var json = [];
	async.each(tags, function(tag, callback){
	  getResponse(tag, tagKey, json, callback);
	}, function(err){
	  debugger;
	  if(err) throw err;
	  json.sort(sort);
	  res.json(json);
  	});
  });
});

app.get('/:country/:category/:tag', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var tagKey = parserUtil.getTagKey(todayKey);
  var tagUrls = tagKey+":"+req.params.tag;
  client.smembers(tagUrls, function(err, urls){
    var json = [];
    async.each(urls, function(url, callback){
	client.hgetall(url, function(err, reply){
	  if(err) return callback(err);
	  var obj = {};
	  obj.title = reply.title;
	  obj.summary = reply.summary;
	  obj.url = url;
	  json.push(obj);
	  callback();
	})
    }, function(err){
	debugger;
	if(err) throw err;
	res.json(json);
    });
  });
});

var sort = function(a, b){
	return b.count - a.count;
};

var getResponse = function(tag, tagKey, json, callback){
	client.get(tagKey+":"+tag+":count", function(err, reply){
	  if(err) return callback(err);
	  if(reply>1){
	    var obj = {};
            obj.tag = tag;
            obj.count = reply;
	    json.push(obj);
	  }
	  callback();
	});
};

app.listen(process.env.PORT || 3000);
console.log('Listening on port 3000');
