var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var date = new Date();
var redis = require("redis"),
        client = redis.createClient();

    client.on("error", function (err) {
        console.log("Redis Error " + err);
    });

var cronFunc = function(jobName, config){
  var job = jobs[jobName]; 
  var parser = require('rssparser');
  console.log("Starting", jobName, date);
  var parse = function (){
	console.log("kicking off job");
	parser.parseURL(config.url, {}, function(err, out){
	    for(var j in out.items){
		(function (j) {
		var item = out.items[j];
		var hash = jobName + ":" + item.url;
		client.hexists(hash, "title", function (err, reply) {
		  debugger;
        	  if(reply == 0){
		    console.log("Saving to db", hash);
		    var date = new Date(item.published_at);
		    client.HMSET(hash,{
			"title":item.title,
			"summary":item.summary,
			"url":item.url,
			"published_at":date
		   } );
		  }else{
			console.log("Already exists in db", hash);
		  }
    		});
	    }) (j);
	}
	});
  }
  job.addCallback(parse);
  job.start();
};
for(var i in jobs){
  cronFunc(i, jobs[i].config);
}

