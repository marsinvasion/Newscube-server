var express = require('express');
var app = express();
var redis = require("redis"),
        client = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
var parserUtil = require('./parserUtil');
var async = require('async');
var minTagCount = 30;
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
	var json = [];
	async.each(tags, function(tag, callback){
	  getResponse(tag, tagKey, json, callback);
	}, function(err){
	  debugger;
	  if(err) throw err;
//	  json.sort(sort);
	  res.json(json);
  	});
  });
});

//- http://localhost:3000/US/news/website/CNN-IBN/11/20
app.get('/:country/:category/website/:handle/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var args = [ todayKey+":"+req.params.handle, req.params.start, req.params.end ];
  client.zrevrange(args, function(err, urls){
    if(err)
	throw err;
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

//- http://localhost:3000/US/news/all
app.get('/:country/:category/all/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var args = [ todayKey+":url", req.params.start, req.params.end ];
  client.zrevrange(args, function(err, urls){
    if(err)
	throw err;
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
	  if(reply>minTagCount){
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
