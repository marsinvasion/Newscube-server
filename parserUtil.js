var IGNORED_DICTIONARY_KEY = "ignored_dictionary";
var score = 1;

var stripHtml = function(htmlString){
  htmlString = htmlString.replace(/<(?:.|\n)*?>/gm, '').trim();
  return htmlString.replace(/&[#a-zA-Z0-9]*;/gm, '');
};

var parseFeed = function(client, out, config, dictionaryKey, handle){
        for(var j in out.items){
            (function (j) {
	    	try{
             	var item = out.items[j];
	     	if(item.title){
		var title = item.title 
                var summary = '';
		if(item.description){
			summary = stripHtml(item.description.toString()); 
		} else if(item.summary) {
			summary = stripHtml(item.summary.toString());
		}
             	var todayKey = getTodayKey(config.country, config.category);
		var published = '';
		if(item.published_at){
			published = new Date(item.published_at);
	     	} else {
			published = new Date(); 
		}
//		client.sadd("country:date", todayKey); // sadd country:category:date US:news:05/01/2013
             	var urlKey = todayKey+":url";
             	var args = [ urlKey, score, item.url ];
		client.zadd(args, function (error, reply){ // sadd US:news:05/01/2013:url cnn.com/rss/sweet.html
                        if(reply == 1){ //url did not exist in db, save feed details
			client.HMSET(item.url,{
                                      "title":stripHtml(title),
                                      "summary":summary,
                                      "published_at":published,
				      "website":config.website,
                                      "inserted_at":new Date(),
				      "source":handle
				      
                                      } ); // hmset cnn.com/rss/sweet.html title "my title" summary "sweet summary" published_at today inserted_at today
			var args1 = [ todayKey+":"+handle, score, item.url ];
			client.zadd(args1, function (error, reply){
			  if(error)
				throw error;
			});
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
		}// end if title
		}catch(err){
		 console.log(err);
		}
             }) (j);
        }
}; 

var saveMatch = function(word, client, dictionaryKey, item, todayKey){
    if(word){
      var matchKey = word.toLowerCase();
      client.sismember(IGNORED_DICTIONARY_KEY, matchKey, function (error, reply){
	if(reply == 0){ // does not match ignored dictionary	
	  client.sismember(dictionaryKey, matchKey, function (error, reply){
            if(reply == 1){ // matches a dictionary word
              //console.log("saving dictionary tag", word);
              saveAndIncrementTagCount(todayKey, matchKey, client, item.url);
	    }// reply ==1
            else if(reply == 0 && word.length>1){
		//does not match a dictionary word
		var first = word.charAt(0);
		if(first == first.toUpperCase() && first != first.toLowerCase()){
        	  //console.log("saving upper case tag", word);
		  saveAndIncrementTagCount(todayKey, matchKey, client, item.url);
		}//end uppercase word check
		else {
		  //console.log("rejected word", word);
		}
	   }
	  });
        } // reply == 0
      }); // is sismember of dictionary
    } //end if(matchKey)
};

var saveAndIncrementTagCount = function(todayKey, matchWord, client, url){
	var tagKey = getTagKey(todayKey);
        var args = [ tagKey, score, matchWord ];
	client.zincrby(args, function(error, reply){
	  if(error)
		throw error;
        }); //zincrby
	var args1 = [ tagKey+":"+matchWord, score, url]; 
        client.zadd(args1, function (err, reply){
	  if(err)
		throw err;
	}); // zadd US:news:05/01/2013:tag:sweet cnn.com/rss/sweet.html
};

var getTodayKey = function(country, category){
             var today = new Date();
             var dd = today.getDate();
             var mm = today.getMonth()+1; //January is 0!
             var yyyy = today.getFullYear();
             if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} today = mm+'/'+dd+'/'+yyyy;
             return country+":"+category+":"+today;
    //         return country+":"+category+":"+"06/26/2013";
};

var getTagKey = function(todayKey){
	return todayKey + ":tag";
};

module.exports = {
	parseFeed : parseFeed,
	stripHtml : stripHtml,
	getTodayKey : getTodayKey,
	getTagKey : getTagKey
};
