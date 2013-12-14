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
app.configure(function(){
  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(app.router);
});
var redis = require("redis"),
        client = redis.createClient(),
        clientPublish = redis.createClient();
client.on("error", function (err) {
        console.log("Redis Error in server " , err);
});
clientPublish.on("error", function (err) {
        console.log("Redis Error in publish server " , err);
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

//- http://localhost:3000/commentId/23dd22
app.get('/commentId/:id', function(req, res){
  commentTree([], req.params.id, res);
});

var commentTree = function(comments, id, res){
  client.hgetall(id+":comment", function (err, reply){
    if(err) throw err;
    if(reply){
	var comment = createComment(id, "1", reply);
	comment.comments = comments;
	commentTree([comment], reply.headId, res);
    }else{
      client.get(id+":url", function(err, url){
    	if(err) throw err;
	client.hgetall(url, function(err, reply){
	  if(err) throw err;
	  if(reply){
	    var news = createNews(reply, id, "1", url);
	    news.comments = comments;
	    res.json([news]);
	  } else {
	    res.end();
	  }
	});
      });	
    }
  });
};

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
    wait.for(getNewsFromId, ids[i], ids[i+1], json);
  }  
  res.json(json);
};

var getNewsFromId = function(id, score, json){
    var url = wait.for(client.get.bind(client), id+":url");
    var reply = wait.for(client.hgetall.bind(client),url);
    if(reply){
      var obj = createNews(reply, id, score, url);
      wait.for(getComments, id, obj.comments);
      json.push(obj);
    }
};

var createNews = function (reply, id, score, url){
            var obj = {};
            obj.id = id;
            obj.score = score;
	    obj.title = reply.title;
            obj.summary = reply.summary;
            obj.website = reply.website;
            obj.published_at = reply.published_at;
            obj.source = reply.source;
            obj.url = url;
	    obj.comments = [];
	return obj;
};

var getComments = function(id, comments){
  var args = [id, 0, -1, "withscores"];
  var commentIds = wait.for(client.zrevrange.bind(client), args);
    for(var i= 0; i<commentIds.length; i=i+2){
      var commentId = commentIds[i];
      var score = commentIds[i+1];
      var reply = wait.for(client.hgetall.bind(client), commentId+":comment");
      var commentObj = createComment(commentId, score, reply);
      comments.push(commentObj);
      wait.for(getComments, commentId, commentObj.comments);
    }
};

var createComment = function(commentId, score, reply){
      var commentObj = {};
      commentObj.id = commentId;
      commentObj.score = score;
      commentObj.comment = reply.comment;
      commentObj.accountName = reply.accountName;
      commentObj.displayName = reply.displayName;
      commentObj.inserted_at = reply.inserted_at;
      commentObj.comments = [];
      return commentObj;
};

// PUT

var idLength = 3;
app.put('/registerDevice', function(req, res) {
  var person = getPerson(req.headers)
  if(!person.googleId || !person.accountName){
    res.statusCode = 401;
  }else{
    var id = req.body.regid;
    addRegisteredId(id, person);
  }
  res.end();
});

app.put('/unregisterDevice', function(req, res) {
  var person = getPerson(req.headers)
  if(!person.googleId || !person.accountName){
    res.statusCode = 401;
  }else{
    var id = req.body.regid;
    client.srem(person.accountName+":registeredIds", id, function (err, res){
	if(err) throw err;
	debugger;
    });
  }
  res.end();
});

app.put('/:country/:category/comment', function(req, res) {
  var person = getPerson(req.headers)  
  if(!person.googleId || !person.accountName){
    res.statusCode = 401;
  }else{
    res.statusCode = 200;
    debugger;
    var headId = req.body.head;
    var comment = req.body.comment;
    addAccount(person);
    addComment(idLength, person.accountName, comment, headId, person.firstName, person.displayName, req.params.country, req.params.category);
  }
  res.end();
});

var addRegisteredId = function (id, person){
  client.sadd(person.accountName+":registeredIds", id, function (err, response){
    if(err) throw err;
  });
};

var getPerson = function(headers){
  var person = {};
  person.accountName = headers['account-name'];
  person.displayName = headers['display-name'];
  person.googleId = headers['google-id'];
  person.firstName = headers['first-name'];
  person.lastName = headers['last-name'];
  return person;
};

var addAccount = function(person){
  client.hexists(person.accountName, "displayName", function (err, res){
    if(err) throw err;
    if(!res){
	client.hmset(person.accountName, {
	  "displayName": person.displayName,
	  "googleId": person.googleId,
	  "firstName": person.firstName,
	  "lastName": person.lastName
	}, function (err, res){
	    if(err) throw err;
	});
    }
  });
};

var addComment = function(idLength, accountName, comment, headId, firstName, displayName, country, category){

  require('crypto').randomBytes(idLength, function(ex, buf) {
    var randomId = buf.toString('hex');
    var commentId = randomId+":comment";
    client.hexists(commentId, "comment", function (err, res){
	debugger;  
    	if (err)
	  throw err;
	if (res == 1){
	  addComment(idLength + 1, accountName, comment, headId, firstName, displayName, country, category); //recursively increase id length till you find an unique id
	}else{
	  var name = accountName;
	  if(firstName){
	    name = firstName;
	  }else if(displayName){
	    name = displayName;
	  }
	  client.hmset(commentId, {
	    "comment":comment,
	    "headId":headId,
	    "accountName":accountName,
	    "displayName":name,
	    "inserted_at":new Date()
	  }, function (err, response){
		if(err)
		  throw err;
	  	clientPublish.publish("comment channel", "{\"headId\":\""+headId+"\", \"commentId\":\""+randomId+"\"}");
	  });
	debugger;
	    var args = [ headId, 1, randomId];
	    client.zincrby(args, function (err, reply){
		if(err)
		  throw err;
	    });  
	    incrUrl(headId, country, category);
	}
    });
  }); 
};

var incrUrl = function (headId, country, category){
    client.get(headId+":url", function (err, reply){
	if(err) throw err;
	debugger;
	if(reply){
	  var trend = [ country+":"+category+":trending", 1, headId ];
	  client.zincrby(trend, function (err, res){
	    if(err) throw err;
	  });
	  var todayKey = parserUtil.getTodayKey(country, category);
	  var todayUrls = [ todayKey+":url", 1, headId ];
	  client.zincrby(todayUrls, function (err, res){
              if(err) throw err;
          });
    	}
    });
}
var port = process.env.PORT || 3000;
app.listen(port);
console.log("worker", cluster.worker.id, 'Listening on port', port);
}
