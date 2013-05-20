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
		var todayKey = config.country+":"+today;
		client.sadd("country:date", todayKey); // sadd country:date US:05/01/2013 
		var urlKey = todayKey+":url";
		client.sadd(urlKey, item.url, function (error, reply){ // sadd US:05/01/2013:url cnn.com/rss/sweet.html
		if(reply == 1){ //url did not exist in db, save feed
		    var published = new Date(item.published_at);
		    client.HMSET(item.url,{
			"title":item.title,
			"summary":item.summary,
			"published_at":published,
			"inserted_at":date
		     } ); // hmset cnn.com/rss/sweet.html title "my title" summary "sweet summary" published_at today inserted_at today
		     console.log("Saved", urlKey, item.url);
		     var regex = /[a-zA-Z]+/g
		     var matched = item.summary.toString().match(regex);
		     if(matched){
			for(var match in matched){
			  if(matched[match]){
			  var matchKey = matched[match].toLowerCase();
			  client.sismember(DICTIONARY_KEY, matchKey, function (error, reply){
			  debugger;
			    if(reply == 1){ // matches a dictionary word
				var tagKey = todayKey+":tag";
				client.sadd(tagKey, matchKey); // sadd US:05/01/2013:tag sweet 
				client.sadd(tagKey+":"+matchKey, item.url); // sadd US:05/01/2013:tag:sweet cnn.com/rss/sweet.html
				console.log("matched tag", matchKey);
			    }// reply ==1
			    else if(reply == 0){
				//does not match a dictionary word
				var first = matchKey.charAt(0);
				if(first == first.toUpperCase() && first != first.toLowerCase()){
				  client.sadd(tagKey, matchKey); // sadd US:05/01/2013:tag sweet
				  client.sadd(tagKey+":"+matchKey, item.url); // sadd US:05/01/2013:tag:sweet cnn.com/rss/sweet.html
				  console.log("Saving upper case word as tag", matchKey);
			   	}//end uppercase word check
			    } // reply == 0
			    else {
				console.log("Something weally weally scwewy happened for word", matchKey);
			    }
			  }); // is sismember of dictionary
			  } //end if(matched[match])
			} //end for loop matched
		    } //matched
		    else {
			console.log("No matches found for", item.summary);
		    } // end else
		  } // reply == 1
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

