var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var date = new Date();
var redis = require("redis"),
        client = redis.createClient();

client.on("error", function (err) {
	console.log("Redis Error " , err);
});
var DICTIONARY_KEY = "dictionary"
var parser = require('rssparser');
var parserUtil = require('./parserUtil');

var cronFunc = function(handle){
  var job = jobs[handle];
  var config = job.config;
  console.log("Starting", handle, date);
  var parse = function (){
     console.log("Kicking off "+handle);
	try{
	parser.parseURL(config.url, {}, function(err, out){
    	  if(err){
        	  console.log("Error parsing url" + err);
    	  }else{
        	  parserUtil.parseFeed(client, out, config, DICTIONARY_KEY,handle);
    	  }
	});
	} catch (err) {
		console.log(err);
	}
  }
  job.addCallback(parse);
  job.start();
};
for(var i in jobs){
  cronFunc(i);
};

