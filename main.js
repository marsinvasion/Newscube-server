var config_dir = process.env.CONFIG_DIR || process.cwd();
var config_name = process.env.NODE_ENV || 'config';
var config_file = config_dir + '/'+config_name+'.json';
var config = require(config_file);
var FeedSub = require('feedsub');

	var job = config.jobs[0];
	console.log("Starting", job.jobName, job.url);

        var reader = new FeedSub(job.url, {
          interval: job.interval,
	  emitOnStart: true
        });

        reader.on('item', function(item) {
          console.log('Got item!');
          console.dir(item);
        });

        reader.start();

