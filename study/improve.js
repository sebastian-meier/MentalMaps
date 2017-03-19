/*jshint -W004 */
var fs = require('fs'),
	turf = require('turf/turf'),
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

var participants = ["XXXXX"];
	participant = 0,
	point = 0,
	data = {};

function loadData(){
	fs.readFile('./selections/'+participants[participant]+'.json', 'utf8', function (err, json) {
		if (err) {
			console.log('Error: ' + err);
			return;
		}

		data[participants[participant]] = JSON.parse(json);

		participant++;
		if(participant<participants.length){
			loadData();
		}else{
			console.log((new Date()), "Data loaded");
			participant = 0;
			processPoints();
		}
	});
}

function processPoints(){
	var p = data[participants[participant]][point];
	var rows = client.querySync("SELECT ST_AsGeoJSON(ST_ClosestPoint(geom, ST_SetSRID(ST_GeomFromText('POINT("+p.x+" "+p.y+")'),4326))) AS point FROM "+participants[participant]+" WHERE ST_Intersects(ST_Buffer(ST_SetSRID(ST_GeomFromText('POINT("+p.x+" "+p.y+")'),4326), 0.001), geom)");
	
	radius = 0.001;
	while(rows.length<1){
		rows = client.querySync("SELECT ST_AsGeoJSON(ST_ClosestPoint(geom, ST_SetSRID(ST_GeomFromText('POINT("+p.x+" "+p.y+")'),4326))) AS point FROM "+participants[participant]+" WHERE ST_Intersects(ST_Buffer(ST_SetSRID(ST_GeomFromText('POINT("+p.x+" "+p.y+")'),4326), "+radius+"), geom)");	
		radius += 0.001;
	}
	
	//Add points
	var points = [];
	for(var i = 0; i<rows.length; i++){
		points.push({
			point:JSON.parse(rows[0].point),
			distances:[]
		});
	}

	//Calculate distances
	for(var p1 = 0; p1<points.length; p1++){
		for(var p2 = 0; p2<points.length; p2++){
			points[p1].distances[p2] = turf.distance(points[p1].point, points[p2].point, 'kilometers');
		}
	}

		//Start with one cluster containing the first point
	var clusters = [[0]], 
		added = 0;

	while(added < points.length){
		clusters = clusterPoints(clusters, points);
		added = pointsInClusters(clusters);
	}

	//Sort cluster by size
	clusters.sort(function(a,b){
		if (a.length<b.length) {
			return -1;
		}

		if (a.length>b.length) {
			return 1;
		}
		
		return 0;
	});

	//Generate the average point of the biggest cluster
	var cluster = clusters[(clusters.length-1)];
	var a = {x:0, y:0};
	for(var c = 0; c<cluster.length; c++){
		a.x += points[cluster[c]].point.coordinates[0];
		a.y += points[cluster[c]].point.coordinates[1];
	}
	a.x = a.x/cluster.length;
	a.y = a.y/cluster.length;

	//To make sure this is on a street and not inside a building (due to GPS inaccuracy) we will search for the closest OSM-highway point and use that as the final point
	var o = {x:null,y:null};
	var rows = client.querySync("SELECT ST_Distance(ST_SetSRID(ST_GeomFromText('POINT("+a.x+" "+a.y+")'),4326), ST_ClosestPoint(wkb_geometry, ST_SetSRID(ST_GeomFromText('POINT("+a.x+" "+a.y+")'),4326))) AS distance, ST_AsGeoJSON(ST_ClosestPoint(wkb_geometry, ST_SetSRID(ST_GeomFromText('POINT("+a.x+" "+a.y+")'),4326))) AS point FROM streets WHERE ST_Intersects(ST_Buffer(ST_SetSRID(ST_GeomFromText('POINT("+a.x+" "+a.y+")'),4326), 0.001), wkb_geometry) ORDER BY ST_Distance(ST_SetSRID(ST_GeomFromText('POINT("+a.x+" "+a.y+")'),4326), ST_ClosestPoint(wkb_geometry, ST_SetSRID(ST_GeomFromText('POINT("+a.x+" "+a.y+")'),4326))) ASC LIMIT 1");
	if(rows.length>=1){
		var p = JSON.parse(rows[0].point);
		o.x = p.coordinates[0];
		o.y = p.coordinates[1];
	}

	data[participants[participant]][point]["ax"] = a.x;
	data[participants[participant]][point]["ay"] = a.y;
	data[participants[participant]][point]["ox"] = o.x;
	data[participants[participant]][point]["oy"] = o.y;

	point++;
	if(point < data[participants[participant]].length){
		console.log((new Date()), participants[participant], point);
		processPoints();
	}else{
		var outputFilename = "./selections/improve/"+participants[participant]+".json";
        fs.writeFile(outputFilename, JSON.stringify(data[participants[participant]]), function(err) {
            console.log((new Date()), participants[participant], "done");
			point = 0;
			participant++;
			if(participant<participants.length){
				processPoints();
			}else{
				console.log((new Date()), "Done");
			}
        });
	}
}

function clusterPoints(clusters, points){
	var toBeAdded = [];
	for(var c = 0; c<clusters[(clusters.length-1)].length; c++){
		for(var d = 0; d<points[clusters[(clusters.length-1)][c]].distances.length; d++){
			if(points[clusters[(clusters.length-1)][c]].distances[d]<250){
				toBeAdded.push(d);
			}
		}
	}

	//Check which of these points are already in the cluster
	var finalToBeAdded = [];
	for(var a = 0; a<toBeAdded.length; a++){
		if(!inArray(clusters[(clusters.length-1)], toBeAdded[a])){
			finalToBeAdded.push(toBeAdded[a]);
		}
	}

	if(finalToBeAdded.length>=1){
		clusters[(clusters.length-1)] = clusters[(clusters.length-1)].concat(finalToBeAdded);
	}else{
		if(pointsInClusters(clusters)<points.length){
			var existingPoints = [];
			for(var c = 0; c<clusters.length; c++){
				for(var p = 0; p<clusters[c].length; p++){
					existingPoints.push(clusters[c][p]);
				}
			}

			var addPoint = false;

			for(var p = 0; p<points.length; p++){
				if(!inArray(existingPoints, p) && !addPoint){
					addPoint = p;
				}
			}

			if(addPoint){
				clusters.push([addPoint]);
			}
		}
	}

	return clusters;
}

function pointsInClusters(clusters){
	var added = 0;
	for(var c in clusters){
		added += clusters[c].length;
	}
	return added;
}

function inArray(haystack, needle) {
    var length = haystack.length;
    for(var i = 0; i < length; i++) {
        if(haystack[i] == needle) return true;
    }
    return false;
}

loadData();
//process.exit();	