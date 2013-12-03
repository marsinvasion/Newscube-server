var express = require('express');
var wait=require('wait.for');
var app = express();
app.configure(function(){
  app.use(express.bodyParser());
  app.use(app.router);
});
var redis = require("redis"),
        client = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
var parserUtil = require('./parserUtil');
var async = require('async');
var minTagCount = 30;

// GET

app.get('/status', function(req, res) {

  client.ping(function(err, reply){
	res.json(reply);
  });
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
  var args = [ tagUrls, req.params.start, req.params.end ];
  
  client.zrevrange(args, function(err, ids){
    if(ids && ids.length>0){
      wait.launchFiber(idsToUrls, ids, res);
    }else{
        res.statusCode = 404;
        res.end();
    }
  });
});

//- http://localhost:3000/US/news/website/CNN-IBN/10/19
app.get('/:country/:category/website/:handle/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var args = [ todayKey+":"+req.params.handle, req.params.start, req.params.end ];
  debugger;
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
});


//- http://localhost:3000/US/news/all/0/9
app.get('/:country/:category/all/:start/:end', function(req, res) {
  var todayKey = parserUtil.getTodayKey(req.params.country, req.params.category);
  var args = [ todayKey+":url", req.params.start, req.params.end ];
  client.zrevrange(args, function(err, ids){
    if(err)
	throw err;
    if(ids && ids.length>0){
      wait.launchFiber(idsToUrls, ids, res);
      //idsToUrls(ids,res);
    }else{
	res.statusCode = 404;
	res.end();
    }
  });
});

var idsToUrls = function(ids, res){
  var json = [];
  for(var i = 0; i < ids.length; i++){
	wait.for(getNewsFromId, ids[i], json);
  }  
  res.json(json);
};

var getNewsFromId = function(id, json){
    debugger;
    var url = wait.for(client.get.bind(client), id+":url");
    var reply = wait.for(client.hgetall.bind(client),url);
    if(reply){
            var obj = {};
            obj.title = reply.title;
            obj.summary = reply.summary;
            obj.website = reply.website;
            obj.published = reply.published_at;
            obj.source = reply.source;
            obj.id = reply.id;
            obj.url = url;
	    obj.comments = [];
            wait.for(getComments, id, obj.comments);
        json.push(obj);
    }
};

var getComments = function(id, comments){
  var args = [id, 0, -1, "withscores"];
  var commentIds = wait.for(client.zrevrange.bind(client), args);
    for(var i= 0; i<commentIds.length; i=i+2){
      var commentId = commentIds[i];
      var score = commentIds[i+1];
      var reply = wait.for(client.hgetall.bind(client), commentId+":comment");
      var commentObj = {};
      commentObj.score = score;
      commentObj.comment = reply.comment;
      commentObj.accountName = reply.accountName;
      commentObj.firstName = reply.firstName;
      commentObj.id = commentId;
      comments.push(commentObj);
      commentObj.comments = [];
      wait.for(getComments, commentId, commentObj.comments);
    }
};

// PUT

var idLength = 3;

app.put('/comment', function(req, res) {
  console.log("received comment "+req.body);
  var accountName = req.headers['account-name'];
  var displayName = req.headers['display-name'];
  var googleId = req.headers['google-id'];
  var firstName = req.headers['first-name'];
  var lastName = req.headers['last-name'];
  if(!googleId || !accountName){
    res.statusCode = 401;
  }else{
    res.statusCode = 200;
    var url = req.body.url;
    debugger;
    var headComment = req.body.headComment;
    var comment = req.body.comment;
    addComment(idLength, accountName, comment, url, headComment, firstName, displayName);
  }
  res.end();
});

var addComment = function(idLength, accountName, comment, url, headComment, firstName, displayName){

  require('crypto').randomBytes(idLength, function(ex, buf) {
    var randomId = buf.toString('hex');
    var commentId = randomId+":comment";
    client.hexists(commentId, "comment", function (err, res){
	debugger;  
    	if (err)
	  throw err;
	if (res == 1){
	  addComment(idLength + 1, comment, accountName, url, firstName, displayName); //recursively increase id length till you find an unique id
	}else{
	
	  client.hmset(commentId, {
	    "comment":comment,
	    "accountName":accountName,
	    "displayName":displayName,
	    "firstName":firstName
	  }, function (err, response){
		if(err)
		  throw err;
	  });
	debugger;
	    var args = [ headComment, 1, randomId];
	    client.zadd(args, function (err, reply){
		if(err)
		  throw err;
	    });  
	}
    });
  }); 
};

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on port', port);
