var redis = require("redis"),
        client = redis.createClient();

client.on("error", function (err) {
        console.log("Redis Error " , err);
});
client.flushdb();
var DICTIONARY_KEY = "ignored_dictionary";

var Lazy = require("lazy");
var fs = require("fs");
Lazy(fs.createReadStream(process.argv[2]))
        .lines
        .forEach(function(line){
          client.sadd(DICTIONARY_KEY, line.toString().toLowerCase());  // sadd dictionary abracadabra
        })
;
