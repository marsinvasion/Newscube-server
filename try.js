var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var cronFunc = function(jobName){
  console.log(jobName);
  var func = function(){
        console.log("print this every time job "+jobName+" runs");
  }
  jobs[jobName].addCallback(func);
  jobs[jobName].start();
};
for(var i in jobs){
  cronFunc(i);
}

console.log(nodejobs.config.dburl);
console.log(jobs.firstjob.config.url);
console.log(jobs.firstjob.config.time);
