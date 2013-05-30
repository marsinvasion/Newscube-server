var stripHtml = function(htmlString){
  return htmlString.replace(/<(?:.|\n)*?>/gm, '').trim();
};

var parseFeed = function(client, out, config, dictionaryKey){
        for(var j in out.items){
            (function (j) {
	     debugger;
             var item = out.items[j];
             var todayKey = getTodayKey(config.country);
	     client.sadd("country:date", todayKey); // sadd country:date US:05/01/2013
             var urlKey = todayKey+":url";
             client.sadd(urlKey, item.url, function (error, reply){ // sadd US:05/01/2013:url cnn.com/rss/sweet.html
                         if(reply == 1){ //url did not exist in db, save feed
                         var published = new Date(item.published_at);
                        var summary = stripHtml(item.summary.toString()); 
			client.HMSET(item.url,{
                                      "title":stripHtml(item.title),
                                      "summary":summary,
                                      "published_at":published,
                                      "inserted_at":new Date()
                                      } ); // hmset cnn.com/rss/sweet.html title "my title" summary "sweet summary" published_at today inserted_at today
                         console.log("Saved", urlKey, item.url);
                         var regex = /[a-zA-Z]+/g
                         var matched = summary.toString().match(regex);
                         if(matched){
                         for(var match in matched){
                         	saveMatch(matched[match], client, dictionaryKey, item, todayKey);
			 } //end for loop matched
                         } //matched
                         else {
                         console.log("No matches found for", item.summary);
                         } // end else
                         } // reply == 1
                         });
             }) (j);
        }
}; 

var saveMatch = function(word, client, dictionaryKey, item, todayKey){
    if(word){
      var matchKey = word.toLowerCase();
      client.sismember(dictionaryKey, matchKey, function (error, reply){
        debugger;
        if(reply == 1){ // matches a dictionary word
		var tagKey = todayKey+":tag";
		client.sadd(tagKey, matchKey); // sadd US:05/01/2013:tag sweet
		client.sadd(tagKey+":"+matchKey, item.url); // sadd US:05/01/2013:tag:sweet cnn.com/rss/sweet.html
		console.log("matched tag", matchKey);
        }// reply ==1
        else if(reply == 0 && word.length>1){
		//does not match a dictionary word
		var first = word.charAt(0);
		if(first == first.toUpperCase() && first != first.toLowerCase()){
		    client.sadd(tagKey, matchKey); // sadd US:05/01/2013:tag sweet
		    client.sadd(tagKey+":"+matchKey, item.url); // sadd US:05/01/2013:tag:sweet cnn.com/rss/sweet.html
		    console.log("Saving upper case word as tag", matchKey);
		}//end uppercase word check
        } // reply == 0
      }); // is sismember of dictionary
    } //end if(matchKey)
};

var getTodayKey = function(country){
             var today = new Date();
             var dd = today.getDate();
             var mm = today.getMonth()+1; //January is 0!
             var yyyy = today.getFullYear();
             if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} today = mm+'/'+dd+'/'+yyyy;
             return country+":"+today;
};

module.exports = {
	parseFeed : parseFeed,
	stripHtml : stripHtml,
	getTodayKey : getTodayKey
};
