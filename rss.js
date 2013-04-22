var parser = require('rssparser');
var options = {};
//rss feeds
parser.parseURL('http://rssfeeds.usatoday.com/usatoday-NewsTopStories', options, function(err, out){
    console.log(out);
});
