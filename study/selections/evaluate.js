/*jshint -W004 */
var fs = require('fs'),
	turf = require('turf'),
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
	types = ["walk_combi","cycling","transport_combi"],
	indexMulti = {
		walk_combi   : 3,
		cycling   : 2,
		transport_combi : 1
	};

//Check if all files are valid JSON

for(var p in participants){

	var test = JSON.parse(fs.readFileSync("./streetview/"+participants[p]+".json", "utf8"));
	var result = JSON.parse(fs.readFileSync("../result_"+participants[p]+".json", "utf8"));

	var pairs = {};

	var features = [];

	for(var t in test){
		features.push(turf.point([test[t].sx, test[t].sy], {id:t}));
	}

	var fc = turf.featureCollection(features);

	for(var t in result.tests){
		if(result.tests[t].marked != false){
			var nearest = turf.nearest(turf.point([result.tests[t].marked.x,result.tests[t].marked.y]), fc);
			pairs[t] = nearest.properties.id;
		}
	}

	for(var t in result.tests){
		var highest = 0, highest_type = null;
		for(type in types){
			var value = Math.pow(Math.log(test[pairs[t]].values[types[type]].mean + 1), 0.1)*indexMulti[types[type]];
			if(value>highest){
				highest = value;
				highest_type = types[type];
			}
		}
		console.log(test[pairs[t]].x, test[pairs[t]].y, highest_type, highest, result.tests[t].range);
	}
}

process.exit();