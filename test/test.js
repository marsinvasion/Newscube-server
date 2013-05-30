var assert = require("assert")
var rss = require('../parserUtil');
var DICTIONARY_KEY = "TEST_DICTIONARY";
describe('Rss Parser', function(){
  var json, redis, client;
	before(function(){
	  json = {"url":"http://testurl.com/rss/edition.rss","country":"US"};
	  redis = require("redis");
	  client = redis.createClient();
	  client.on("error", function (err) {
		console.log("Redis Error " , err);
	  });
	  client.select(2, function() { /* ... */ }); // select a non default database
	  var fs = require("fs");
	  var Lazy = require("lazy");
	  Lazy(fs.createReadStream('test/words'))
		.lines
		.forEach(function(line){
		  client.sadd(DICTIONARY_KEY, line.toString().toLowerCase());  // sadd dictionary abracadabra
	  	})
	});

	describe('#parseItem()', function(done){
	  it('should parse and save 18 tags', function(){
		var rssFeed = require('./rss');
		rss.parseFeed(client, rssFeed,json,DICTIONARY_KEY);
		var tagKey = rss.getTodayKey(json.country)+":tag";
		client.smembers(tagKey, function(error, replies){
			console.log("received reply", replies);
		});
	  });
	});



	  describe('#stripHtml()', function(){
		var stripStr = "Firefighters responding to fire at a West, Tex., fertilizer depot last week knew the risks";
	  	var htmlString = "Firefighters responding to fire at a West, Tex., fertilizer depot last week knew the risks<div class=\"feedflare\"> <a href=\"http: //test.rss.feed.com/~ff/usatoday-NewsTopStories?a=yhl5CIzw0LY: UPBT8_yZE1o: -BTjWOF_DHI\"><img src=\"http: //feeds.feedburner.com/~ff/usatoday-NewsTopStories?i=yhl5CIzw0LY: UPBT8_yZE1o: -BTjWOF_DHI\" border=\"0\"></img></a> <a href=\"http: //test.rss.feed.com/~ff/usatoday-NewsTopStories?a=yhl5CIzw0LY: UPBT8_yZE1o: yIl2AUoC8zA\"><img src=\"http: //feeds.feedburner.com/~ff/usatoday-NewsTopStories?d=yIl2AUoC8zA\" border=\"0\"></img></a> </div><img src=\"http: //feeds.feedburner.com/~r/usatoday-NewsTopStories/~4/yhl5CIzw0LY\" height=\"1\" width=\"1\"/>";
		
		//test if strip works
		it('should be equal', function(){
      			assert.equal(rss.stripHtml(htmlString), stripStr);
    		});
	  });

	  after(function(){
		client.flushdb();
	  });
});

