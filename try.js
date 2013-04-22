var nodejobs = require('node-cron-jobs');
var jobs = nodejobs.jobs;
var cronFunc = function(jobName, config){
  console.log("Starting", jobName);
  var func = function(){
	var FeedSub = require('feedsub');

	reader = new FeedSub(config.url, {
	  interval: config.interval,
	  emitOnStart: true
	});

	reader.on('item', function(item) {
	  console.log('Got item!');
	  console.dir(item);
	});

	reader.start();

        console.log("print this every time job runs", jobName, config);
  }
  jobs[jobName].addCallback(func);
  jobs[jobName].start();
};
for(var i in jobs){
  cronFunc(i, jobs[i].config);
}

