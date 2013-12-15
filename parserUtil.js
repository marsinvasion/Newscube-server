var IGNORED_DICTIONARY_KEY = "ignored_dictionary";
var score = 1;

var stripHtml = function(htmlString){
  htmlString = htmlString.replace(/<(?:.|\n)*?>/gm, '').trim();
  return htmlString.replace(/&[#a-zA-Z0-9]*;/gm, '');
};
var client;

var parseFeed = function(clientDB, out, config, dictionaryKey, handle){
  client = clientDB;
  var todayKey = getTodayKey(config.country, config.category);
    for(var j in out.items){
        (function (j) {
	   try{
		var item = out.items[j];
              	var summary = getSummary(item);
	     	if(item.title && summary){
             	  client.hexists(item.url, "title", function (error, reply){
		    if(error)
		      throw error;
		    if(reply==0){
		      saveNews(3, config, item, todayKey, dictionaryKey, handle);    
 		    }
		  });
		}// end if title
		}catch(err){
		 console.log(err);
		}
             }) (j);
        }
}; 


var saveNews = function(idLength, config, item, todayKey, dictionaryKey, handle){
  var urlKey = todayKey+":url";
  require('crypto').randomBytes(idLength, function(ex, buf) {
    var randomId = buf.toString('hex');
    client.get(randomId+":url", function (err, response){
	if(err)
	  throw err;
	if(response){ //id exists
	  saveNews(idLength + 1, config, item, todayKey, dictionaryKey, handle);
	}else{
 	  saveNewsArticle(item, randomId, config, handle);
	  client.set(randomId+":url", item.url);
	  var args = [ urlKey, 1, randomId];
	  client.zadd(args, function (error, reply){ // sadd US:news:05/01/2013:url fd32423
	    debugger;
	    if(error)
		throw error;
	  });
	  var args1 = [ todayKey+":"+handle, 1, randomId ];
	  client.zadd(args1, function (error, reply){
		if(error)
		  throw error;
 	  });
          var regex = /[a-zA-Z]+/g
          var summary = getSummary(item);
	  var matched = summary.toString().match(regex);
          if(matched){
            for(var match in matched){
              saveMatch(matched[match], dictionaryKey, item, todayKey, randomId);
	    }  //end for loop matched
          } //matched
	}
    });
  });
}

var saveNewsArticle = function(item, randomId, config, handle){
	var title = item.title
        var summary = getSummary(item);
        var published = '';
        if(item.published_at){
                        published = new Date(item.published_at);
        } else {
                        published = new Date();
        }
	client.HMSET(item.url,{
                "title":stripHtml(title),
                "summary":summary,
                "published_at":published,
                "website":config.website,
                "inserted_at":new Date(),
                "source":handle,
		"id":randomId
        } );
};

var getSummary = function(item){
    var summary = '';
        if(item.description){
             summary = stripHtml(item.description.toString());
        } else if(item.summary) {
             summary = stripHtml(item.summary.toString());
        }
   return summary;
};
var saveMatch = function(word, dictionaryKey, item, todayKey, randomId){
    if(word){
      var matchKey = word.toLowerCase();
      client.sismember(IGNORED_DICTIONARY_KEY, matchKey, function (error, reply){
	if(reply == 0){ // does not match ignored dictionary	
	  client.sismember(dictionaryKey, matchKey, function (error, reply){
            if(reply == 1){ // matches a dictionary word
              //console.log("saving dictionary tag", word);
              saveAndIncrementTagCount(todayKey, matchKey, client, randomId);
	    }// reply ==1
            else if(reply == 0 && word.length>1){
		//does not match a dictionary word
		var first = word.charAt(0);
		if(first == first.toUpperCase() && first != first.toLowerCase()){
        	  //console.log("saving upper case tag", word);
		  saveAndIncrementTagCount(todayKey, matchKey, client, randomId);
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

var saveAndIncrementTagCount = function(todayKey, matchWord, client, randomId){
	var tagKey = getTagKey(todayKey);
        var args = [ tagKey, score, matchWord ];
	client.zincrby(args, function(error, reply){
	  if(error)
		throw error;
        }); //zincrby
	var args1 = [ tagKey+":"+matchWord, score, randomId]; 
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
