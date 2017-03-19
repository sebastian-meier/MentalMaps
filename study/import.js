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

var participants = {
	"XXXXX":[
		'../data/study/XXXXX/storyline_2015.geojson'
	]
};

//Check if all files are valid JSON

for(var p in participants){
	//Clear the database
	client.querySync('TRUNCATE "'+p+'"');
	console.log((new Date()), "TRUNCATE", p);

	for(var f in participants[p]){
		//Cleaning the moves file exports
		var file = fs.readFileSync(participants[p][f], 'utf8');
			file = file.replace(',]',']');
			file = file.replace('[,','[');

		while(file.indexOf(',,')>=0){
			file = file.replace(',,',',');
		}

		//Sometimes the moves export expects more to come and forgets to close the export array/object
		if(file.substr(file.length-1,1)==","){
			file = file.substr(0, file.length-1)+"]}";
		}

		var json = false;

		try{
			json = JSON.parse(file);
		}catch(e){
			console.log("JSON e:",participants[p][f],e);
		}

		if(json){
			importJson(json, p);
		}
	}
}

function importJson(json, participant){
	//So far we have three types of JSON imports
	var activities = [];

	//GeoJSON
	if(
		(Object.prototype.toString.call(json) === '[object Object]')
		&& ("type" in json)
		&& (json.type === "FeatureCollection")
	){

		activities = parseGeoJson(json);

		//Moves export with segments
	}else if(
		(Object.prototype.toString.call(json) === '[object Array]')
	){

		activities = parseMovesJson(json);

		//Same as above, just encapsulated in an object
	}else if(
		(Object.prototype.toString.call(json) === '[object Object]')
		&& ("export" in json)
		&& (Object.prototype.toString.call(json.export) === '[object Array]')
	){

		activities = parseMovesJson(json.export);

	}else{
		console.log("Unknown JSON file structure.");
	}

	for(var i in activities){
		pgdata = [
			cleanActivity(activities[i].activity),
			activities[i].path,
			activities[i].startTime,
			activities[i].endTime
		];

		client.querySync("INSERT INTO "+p+" (activity, geom, starttime, endtime)VALUES($1::text, ST_GeomFromText($2, 4326), $3::timestamp AT TIME ZONE 'Europe/Amsterdam', $4::timestamp AT TIME ZONE 'Europe/Amsterdam')", pgdata);
	}

	console.log(participant, activities.length);

}

function cleanActivity(a){
	switch(a){
		case 'wlk':
			return 'walking';
		break;
		case 'trp':
			return 'transport';
		break;
		case 'cyc':
			return 'cycling';
		break;
		case 'run':
			return 'running';
		break;
		default:
			return a;
		break;
	}
}


function parseGeoJson(json){
	var activities = [];

	for(var i in json.features){
		var feature = json.features[i];
			
		if(feature.geometry.type == "MultiLineString"){
			for(var l in feature.geometry.coordinates){
				var obj = {
					activity:feature.properties.activities[l].activity,
					endTime:(moment.tz(feature.properties.activities[l].endTime, zone)).format(timeFormat),
					startTime:(moment.tz(feature.properties.activities[l].startTime, zone)).format(timeFormat),
					path:''
				};

				var geometry = feature.geometry.coordinates[l];

				if(geometry.length > 1){

					for(var g in geometry){
						if(obj.path !== ''){
							obj.path += ",";
						}
						obj.path += geometry[g][0]+' '+geometry[g][1];
					}

					obj.path = 'LINESTRING('+obj.path+')';

					activities.push(obj);
				}
			}
		}else if(feature.geometry.type == "Point"){
			//ignore for now
		}else{
			//unknown
			console.log(feature.geometry.type);
		}
	}

	return activities;
}

function parseMovesJson(json){
	var activities = [];

	for(var i in json){
		for(var s in json[i].segments){
			var segment = json[i].segments[s];

			if(segment.type == "move"){
				for(var a in segment.activities){
					activity = segment.activities[a];

					var obj = {
						activity:activity.activity,
						endTime:(moment.tz(activity.endTime, zone)).format(timeFormat),
						startTime:(moment.tz(activity.startTime, zone)).format(timeFormat),
						path:''
					};

					var geometry = activity.trackPoints;

					for(var g in geometry){
						if(obj.path !== ''){
							obj.path += ",";
						}
						obj.path += geometry[g].lon+' '+geometry[g].lat;
					}

					obj.path = 'LINESTRING('+obj.path+')';

					activities.push(obj);
				}
			}else if(segment.type == "place"){
				//ignore for now
			}else if(segment.type == "off"){
				//ignore for now
			}else{
				//unknown
				console.log(segment.type);
			}
		}
	}

	return activities;
}

process.exit();