var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var func = function(){
	console.log('print this every time the job runs');
}
jobs.firstjob.addCallback(func);
jobs.firstjob.start();
console.log(nodejobs.config.dburl);
console.log(jobs.firstjob.config.url);
console.log(jobs.firstjob.config.time);
console.log('**********');
var func1 = function(){
	console.log('print for second job');
}
jobs.secondjob.addCallback(func1);
