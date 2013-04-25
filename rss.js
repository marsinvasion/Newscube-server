var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var date = new Date();
var cronFunc = function(jobName, config){
  var job = jobs[jobName]; 
  console.log("Starting", jobName, date);
  console.log("callback", job.onTick);
  function parse(){
	console.log("kicking off job");
	var parser = require('rssparser');
	parser.parseURL(config.url, {}, function(err, out){
	    console.log(out);
	});
  }
  console.log("callbacks", job._callbacks.length);
  job.addCallback(parse);
  job.start();
  console.log("callbacks", job._callbacks.length);
  console.log(job.cronTime.getTimeout(), "next fire", jobName);
};
for(var i in jobs){
  cronFunc(i, jobs[i].config);
}

