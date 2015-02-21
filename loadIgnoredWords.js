var redis = require("redis"),
        client = redis.createClient();

client.on("error", function (err) {
        console.log("Redis Error " , err);
});
var DICTIONARY_KEY = "ignored_dictionary";

var Lazy = require("lazy");
var fs = require("fs");
Lazy(fs.createReadStream('ignorewords'))
        .lines
        .forEach(function(line){
          client.sadd(DICTIONARY_KEY, line.toString().toLowerCase());  // sadd dictionary abracadabra
        })
;
