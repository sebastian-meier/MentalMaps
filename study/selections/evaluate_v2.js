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
	dbs = ["XXXXX"],
	types = ["walking","running","cycling","transport"],
	indexMulti = {
		walking   : 3,
		cycling   : 2,
		transport : 1
	};

//Check if all files are valid JSON

var export_json = [];

var ranges = {
	"0":[],
	"1":[],
	"2":[],
	"3":[],
	"4":[],
	"5":[],
	"6":[]
};

var a_highest = {
	"0":{},
	"1":{},
	"2":{},
	"3":{},
	"4":{},
	"5":{},
	"6":{}
};

for(var h in a_highest){
	a_highest[h]["walking"] = 0;
	a_highest[h]["cycling"] = 0;
	a_highest[h]["transport"] = 0;
}

for(var p in participants){

	var result = JSON.parse(fs.readFileSync("../result_"+participants[p]+".json", "utf8"));

	for(var t in result.tests){
		if(result.tests[t].marked != false){
			var rows = client.querySync(
				" SELECT " +
					" COUNT(*), activity" +
				" FROM \""+dbs[p]+"\"" + 
				" WHERE " + 
					" ST_Intersects( "+
						"ST_Buffer("+
							"ST_SetSRID("+
								"ST_GeomFromText("+
									"'POINT("+result.tests[t].marked.x+" "+result.tests[t].marked.y+")'"+
								")"+
							",4326)"+
						", 0.001)"+
					", geom)"+
				" GROUP BY activity "
			);

			var item = {};

			var highest = 0, highest_type = null;
			for(var r in rows){
				var value = Math.pow(Math.log(parseInt(rows[r].count) + 1), 0.1)*indexMulti[rows[r].activity];
				item[rows[r].activity] = value;
				if(value>highest){
					highest = value;
					highest_type = rows[r].activity;
				}
			}

			item["highest"] = highest;
			item["highest_type"] = highest_type;
			item["range"] = result.tests[t].range;

			ranges[result.tests[t].range].push(highest);
			a_highest[result.tests[t].range][highest_type]++;

			//console.log(result.tests[t].range, highest, highest_type);

			export_json.push(item);
		}
	}
}

fs.writeFileSync("experimental_results.json", JSON.stringify(export_json));

for(var r in ranges){
	var csv = "i_"+r;
	var ncsv = "i_"+r;
	for(var i in ranges[r]){
		csv += "\n"+ranges[r][i];
		if(ranges[r][i]>0){
			ncsv += "\n"+ranges[r][i];
		}
	}
	fs.writeFileSync("experimental_results_"+r+".csv", csv);
	fs.writeFileSync("experimental_results_nzero_"+r+".csv", ncsv);
}

var stack_csv = "type,walking,cycling,transport";
var rel_stack_csv = "type,walking,cycling,transport";

for(var h in a_highest){
	stack_csv += "\n"+"l_"+h+","+a_highest[h]["walking"]+","+a_highest[h]["cycling"]+","+a_highest[h]["transport"];

	var rel_sum = a_highest[h]["walking"] + a_highest[h]["cycling"] + a_highest[h]["transport"];
	rel_stack_csv += "\n"+"l_"+h+","+(a_highest[h]["walking"]/rel_sum*100)+","+(a_highest[h]["cycling"]/rel_sum*100)+","+(a_highest[h]["transport"]/rel_sum*100);
}

fs.writeFileSync("experimental_stacked.csv", stack_csv);
fs.writeFileSync("experimental_stacked_rel.csv", rel_stack_csv);

process.exit();