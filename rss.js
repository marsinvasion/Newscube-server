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
	console.log("kicking off job", jobName);
	parser.parseURL(config.url, {}, function(err, out){
	    for(var j in out.items){
		(function (j) {
		var item = out.items[j];
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth()+1; //January is 0!
		var yyyy = today.getFullYear();
		if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} today = mm+'/'+dd+'/'+yyyy;
		var key = config.country+":"+today;
		client.sadd("country", key);
		client.sadd(key, item.url, function (error, reply){
		debugger;
		if(reply == 1){ //url did not exist in db, save feed
		    var published = new Date(item.published_at);
		    client.HMSET(item.url,{
			"title":item.title,
			"summary":item.summary,
			"published_at":published,
			"inserted_at":date
		   } );
		   console.log("Saved", key, item.url);
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

