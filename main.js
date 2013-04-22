var config_dir = process.env.CONFIG_DIR || process.cwd();
var config_name = process.env.NODE_ENV || 'config';
var config_file = config_dir + '/'+config_name+'.json';
var config = require(config_file);

var feed = function(job){
	console.log("Starting", job.jobName, job.url);
	var FeedSub = require('feedsub');

	var reader = new FeedSub(job.url, {
	  interval: job.interval
	});

	reader.on('item', function(item) {
	  console.log('Got item!');
	  console.dir(item);
	});

	reader.start();
};
for(var i in config.jobs){
  feed(config.jobs[i]);
}

