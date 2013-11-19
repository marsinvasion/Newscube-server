var express = require('express');
var app = express();
var redis = require("redis"),
        client = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
var parserUtil = require('./parserUtil');
var async = require('async');

app.get('/status', function(req, res) {

  client.ping(function(err, reply){
	res.json(reply);
  });
});

//- http://localhost:3000/US/news/tag
app.get('/:country/:category/tag', function(req, res) {
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

//- http://localhost:3000/US/news/website/cnn.com
app.get('/:country/:category/website/:website', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  client.SRANDMEMBER(todayKey+":"+req.params.website,10, function(err, urls){
    response(urls,res);
  });
});

//- http://localhost:3000/US/news/tag/Snowden
app.get('/:country/:category/tag/:tag', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var tagKey = parserUtil.getTagKey(todayKey);
  var tagUrls = tagKey+":"+req.params.tag;
  client.smembers(tagUrls, function(err, urls){
    response(urls,res);
  });
});

//- http://localhost:3000/US/news/random
app.get('/:country/:category/random', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  client.SRANDMEMBER(todayKey+":url", 10, function(err, urls){
    response(urls,res);
  });
});

var response = function(urls, res){
    var json = [];
    async.each(urls, function(url, callback){
        client.hgetall(url, function(err, reply){
          if(err) return callback(err);
          if(reply){
	  var obj = {};
          obj.title = reply.title;
          obj.summary = reply.summary;
          obj.url = url;
          obj.website = reply.website;
	  obj.published = reply.published_at;
	  obj.source = reply.source;
	  json.push(obj);
          callback();
	  }else{
            console.log("null item", reply);
	  }
        })
    }, function(err){
        debugger;
        if(err) throw err;
        res.json(json);
    });
};

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

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on port', port);
