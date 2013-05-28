var assert = require("assert")

describe('Rss Parser', function(){
  var rss;
  before(function(){
    rss = require('../parserUtil');
  });

  describe('#parseItem()', function(){
    it('should parse', function(){
  	var rssFeed = require('./rss.json');
	rss.parseFeed(null, rssFeed,null,null);
    });
  });
});
