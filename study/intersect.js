/*jshint -W004 */
var fs = require('fs'),
	fs = require('turf'),
    Client = require('pg-native'),
    moment = require('moment-timezone'),
    timeFormat = "YYYYMMDDTHHmmssZ",
    zone = 'Europe/Amsterdam';

var client,
	pg_conf = {
		database:'moves_study',
		user:'sebastianmeier',
		password:'',
		port:5432,
		host:"localhost",
		ssl:false
	};

client = new Client();
client.connectSync("postgres://"+pg_conf.user+":"+pg_conf.password+"@"+pg_conf.host+"/"+pg_conf.database);

console.log((new Date()), "START");

var participants = ["XXXXX"],
	types = ["walking","running","cycling","transport","train","underground","bus","car","airplane"];

//Check if all files are valid JSON

for(var p in participants){
	//Clear the database
	for(var t in types){
		try{
			client.querySync("ALTER TABLE re_blocks ADD COLUMN "+participants[p]+"_"+types[t]+" integer DEFAULT 0");
		}catch(e){
			if(e.toString().indexOf("already exists")){
				//Column already exists
				client.querySync("UPDATE re_blocks SET "+participants[p]+"_"+types[t]+" = 0");
			}else{
				console.log(e);
			}
		}
	}

	console.log((new Date()), "re_blocks prepared for", participants[p]);

	//Check which locations are in Berlin:
	client.querySync("UPDATE "+participants[p]+" SET in_berlin = 1 WHERE EXISTS ( SELECT 1 FROM lor_bezirk WHERE "+participants[p]+".geom && lor_bezirk.geom AND ST_Intersects("+participants[p]+".geom, lor_bezirk.geom))");

	//Delete all locations outside Berlin:
	client.querySync("DELETE FROM "+participants[p]+" WHERE in_berlin = 0");

	for(var t in types){
		client.querySync("UPDATE re_blocks SET "+participants[p]+"_"+types[t]+" = ( SELECT COUNT(*) FROM "+participants[p]+" WHERE "+participants[p]+".activity = '"+types[t]+"' AND "+participants[p]+".geom && re_blocks.geom_buffer AND ST_Intersects("+participants[p]+".geom, re_blocks.geom_buffer))");
		console.log((new Date()), "re_blocks intersect for", participants[p], types[t]);
	}

	console.log((new Date()), "finished", participants[p]);
}

process.exit();