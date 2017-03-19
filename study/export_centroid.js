/*jshint -W004 */
var fs = require('fs'),
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
	types = ["walking","running","cycling","transport","train","underground","bus","car","airplane"],
	//types = ["walking","running","cycling","transport"],
	transport_combi = ["transport","underground","bus","car","airplane"],
	walk_combi = ["walking","running"];


//Check if all files are valid JSON

for(var p in participants){

	var geojson = {
		type:"FeatureCollection",
		features:[]
	};

	var select_query = "",
		where_query = "";

	for(var t in types){
		if(where_query!=""){
			where_query += " OR ";
		}
		where_query += ' '+participants[p]+"_"+types[t]+' > 0 ';

		select_query += ', '+participants[p]+"_"+types[t]+' ';
	}

	//Clear the database
	try{
		var pQuery = 'SELECT ogc_fid, ST_AsGeoJSON(ST_Centroid(wkb_geometry)) AS geom '+select_query+' FROM re_blocks WHERE '+where_query+' ';

		var rows = client.querySync(pQuery);

		for(var r in rows){
			var feature = {
				type: "Feature",
				geometry: JSON.parse(rows[r].geom),
				properties: {
					id: rows[r].ogc_fid,
					transport_combi: 0,
					walk_combi: 0
				}
			};

			for(var t in types){
				feature.properties[types[t]] = rows[r][participants[p]+"_"+types[t]];
				if((t in transport_combi)){
					feature.properties.transport_combi += rows[r][participants[p]+"_"+types[t]];
				}
				if((t in walk_combi)){
					feature.properties.walk_combi += rows[r][participants[p]+"_"+types[t]];
				}
			}

			geojson.features.push(feature);
		}

	}catch(e){
		console.log(e);
	}

	fs.writeFileSync('./export_map/'+participants[p]+'_centroid.geojson', JSON.stringify(geojson));
}

console.log((new Date()), "DONE");

process.exit();