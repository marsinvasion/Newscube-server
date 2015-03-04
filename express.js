var cluster = require('cluster');

if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
    
    // Listen for dying workers
    cluster.on('exit', function (worker) {
      console.log('Worker ' + worker.id + ' died :(');
      cluster.fork();
    });

// Code to run if we're in a worker process
} else {

var express = require('express');
var wait=require('wait.for');
var app = express();
var redis = require("redis"),
        client = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
var parserUtil = require('./parserUtil');
var async = require('async');
app.configure(function(){

  app.use(function(req, res, next){
    var ua = req.headers['user-agent'];
    client.zadd('online', Date.now(), ua, next);
  });

  app.use(function(req, res, next){
    var min = 60 * 1000;
    var ago = Date.now() - min;
    client.zrevrangebyscore('online', '+inf', ago, function(err, users){
      if (err) return next(err);
      req.online = users;
      next();
    });
  });
  
  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(app.router);
});

var minTagCount = 30;

// GET

app.get('/status', function(req, res) {

  client.ping(function(err, reply){
	res.json(reply);
  });
});


app.get('/online', function(req, res){
  res.send(req.online.length + ' users online');
});

//- http://localhost:3000/US/news/tag/0/99
app.get('/:country/:category/tag/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var tagKey = parserUtil.getTagKey(todayKey);
  var args = [ tagKey, req.params.start, req.params.end, "withscores" ];
  
  client.zrevrange(args, function(err, tags){
    if(err)
	  throw err;
    var json = [];
    for(var i = 0; i < tags.length; i = i + 2){
    	var obj = {};
        obj.tag = tags[i];
        obj.count = tags[i+1];
        json.push(obj);
    }
    res.json(json);
  });
});

//- http://localhost:3000/US/news/tag/Snowden/0/9
app.get('/:country/:category/tag/:tag/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var tagKey = parserUtil.getTagKey(todayKey);
  var tagUrls = tagKey+":"+req.params.tag;
  var args = [ tagUrls, req.params.start, req.params.end, "withscores" ];
  getIds(args, res);
});

//- http://localhost:3000/US/news/website/CNN-IBN/10/19
app.get('/:country/:category/website/:handle/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var args = [ todayKey+":"+req.params.handle, req.params.start, req.params.end, "withscores" ];
  getIds(args, res);
});


//- http://localhost:3000/US/news/today/0/9
app.get('/:country/:category/today/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var args = [ todayKey+":url", req.params.start, req.params.end, "withscores" ];
  getIds(args, res);
});


//- http://localhost:3000/US/news/trending/0/9
app.get('/:country/:category/trending/:start/:end', function(req, res) {
  var args = [ req.params.country+":"+req.params.category+":trending", req.params.start, req.params.end, "withscores" ];
  getIds(args, res);
});

app.get('/stat', function(req,res){
  res.json('stat');
});

var getIds = function(args, res){
  client.zrevrange(args, function(err, ids){
    if(err)
	throw err;
    if(ids && ids.length>0){
      wait.launchFiber(idsToUrls, ids, res);
    }else{
	res.statusCode = 404;
	res.end();
    }
  });
};

var idsToUrls = function(ids, res){
  var json = [];
  for(var i = 0; i < ids.length; i = i+2){
    wait.for(getNewsFromId, ids[i], json);
  }  
  res.json(json);
};

var getNewsFromId = function(id, json){
    var url = wait.for(client.get.bind(client), id+":url");
    var reply = wait.for(client.hgetall.bind(client),url);
    if(reply){
      var obj = createNews(reply, id, url);
      json.push(obj);
    }
};

var createNews = function (reply, id, url){
            var obj = {};
            obj.id = id;
            obj.score = 1;
	    obj.title = reply.title;
            obj.summary = reply.summary;
            obj.website = reply.website;
            obj.published_at = reply.published_at;
            obj.source = reply.source;
            obj.url = url;
	return obj;
};

var port = process.env.PORT || 3000;
app.listen(port);
console.log("worker", cluster.worker.id, 'Listening on port', port);
}
