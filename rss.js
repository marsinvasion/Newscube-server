var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var config = nodejobs.config;
var date = new Date();
var redis = require("redis"),
        client = redis.createClient();

client.on("error", function (err) {
	console.log("Redis Error " , err);
});
var DICTIONARY_KEY = "dictionary"
var parser = require('rssparser');

var cronFunc = function(jobName, config){
  var job = jobs[jobName]; 
  console.log("Starting", jobName, date);
  var parse = function (){
	console.log("kicking off job", jobName);
	parser.parseURL(config.url, {}, parseItem);
  }
  job.addCallback(parse);
  job.start();
};
for(var i in jobs){
  cronFunc(i, jobs[i].config);
}
var parseItem = function(err, out){
    if(err){
        console.log(err);
    }else{
        var parserUtil = require('./parserUtil')
        parserUtil.parseFeed(client, out, config, DICTIONARY_KEY);
    }
}

