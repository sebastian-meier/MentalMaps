var Client = require('pg-native'),
    http = require('http'),
    express = require('express'),
    app = express();

var client,
	pg_conf = {
		database:'sebastianmeier',
		user:'sebastianmeier',
		password:'',
		port:5432,
		host:"localhost",
		ssl:false
	};

var qa1 = "",
    qa2 = "",
    qa3 = "",
    qa4 = "",
    qa5 = "",
    year = "all",
    buildtype = "re_blocks";

if(year!=="all"){
    qa1 = " AND year = "+year;
    qa2 = "_"+year;
    qa3 = ", year";
    qa4 = " WHERE year = "+year;
    qa5 = ", "+year;
}

client = new Client("postgres://"+pg_conf.user+":"+pg_conf.password+"@"+pg_conf.host+"/"+pg_conf.database);
client.connectSync();


function locations(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    var rows = client.querySync("SELECT ST_AsGeoJSON(geom) FROM moves_location WHERE in_berlin = 1");
    for(var i in rows){
        json.push((JSON.parse(rows[i].st_asgeojson)).coordinates);
    }

	res.send(JSON.stringify(json));
}

function checkYearParam(param){
    var allowed = ["all", "2013", "2014", "2015"];
    var tvalid = false;
    for(var i in allowed){if(allowed[i]==param){tvalid = true;}}
    if(!tvalid || param === "all"){
        param = 0;
    }else if (param !== "all") {
        param = parseInt(param);
    }
    return param;
}

function activity(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    var allowed = ["running", "cycling", "transport", "walking", "bus", "underground", "plane"];
    var valid = false;
    for(var i in allowed){if(allowed[i]==req.params[0]){valid = true;}}

    req.params[1] = checkYearParam(req.params[1]);

    var ba1 = "", ba2 = "";
    if(req.params[2]==="true"){
        ba1 = "ST_Buffer(";
        ba2 = ", 0.001, 'endcap=round join=round')";
    }

    if(valid){
        var rows = client.querySync("SELECT id, ST_AsGeoJSON("+ba1+"geom"+ba2+"), cluster FROM moves_activity WHERE in_berlin = 1 AND activity = '"+req.params[0]+"' AND year = "+req.params[1]);
        for(i in rows){
            json.push({id:rows[i].id, cluster:rows[i].cluster, path:JSON.parse(rows[i].st_asgeojson)});
        }

    	res.send(JSON.stringify(json));
    }else{
        res.send("Invalid request.");
    }
}

function allactivity(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);

    var ba1 = "", ba2 = "";
    if(req.params[1]==="true"){
        ba1 = "ST_Buffer(";
        ba2 = ", 0.001, 'endcap=round join=round')";
    }

    var rows = client.querySync("SELECT id, ST_AsGeoJSON("+ba1+"geom"+ba2+"), cluster FROM moves_activity WHERE in_berlin = 1 AND year = "+req.params[0]);
    for(i in rows){
        json.push({id:rows[i].id, cluster:rows[i].cluster, path:JSON.parse(rows[i].st_asgeojson)});
    }

	res.send(JSON.stringify(json));
}

function building(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[1] = checkYearParam(req.params[1]);
    var qa = "";
    if(req.params[1]>0){
        qa = "_"+req.params[1];
    }

    if(req.params[0]){
        var rows = client.querySync("SELECT ST_AsGeoJSON(ST_Reverse(wkb_geometry)), moves_count FROM "+buildtype+" WHERE moves"+qa+"_cluster = "+parseInt(req.params[0]));
        for(var i in rows){
            json.push({path:JSON.parse(rows[i].st_asgeojson), count:rows[i].moves_count});
        }
    }

	res.send(JSON.stringify(json));
}

function buildings(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);
    var qa = "";
    if(req.params[0]>0){
        qa = "_"+req.params[0];
    }

    var rows = client.querySync("SELECT ST_AsGeoJSON(ST_Reverse(wkb_geometry)), moves"+qa+"_count AS counter, moves"+qa+"_cluster AS cluster FROM "+buildtype+" WHERE moves"+qa+"_count > 0 ORDER BY moves"+qa+"_cluster");
    for(var i in rows){
        json.push({path:JSON.parse(rows[i].st_asgeojson), count:parseInt(rows[i].counter), cluster:parseInt(rows[i].cluster)});
    }

	res.send(JSON.stringify(json));
}

function mod_buildings(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);
    var qa = "";
    if(req.params[0]>0){
        qa = "_"+req.params[0];
    }

    var rows = client.querySync("SELECT ST_AsGeoJSON(ST_Buffer(ST_Reverse(wkb_geometry),0.00002)), moves"+qa+"_count AS counter, moves"+qa+"_cluster AS cluster FROM "+buildtype+" WHERE moves"+qa+"_count > 0 AND ST_Area(wkb_geometry) > 0.00000001 ORDER BY moves"+qa+"_cluster");
    for(var i in rows){
        json.push({path:JSON.parse(rows[i].st_asgeojson), count:parseInt(rows[i].counter), cluster:parseInt(rows[i].cluster)});
    }

	res.send(JSON.stringify(json));
}

function hull(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[1] = checkYearParam(req.params[1]);

    if(req.params[0]){
        var rows = client.querySync("SELECT cluster_id, ST_X(ST_Centroid(hull)) AS x, ST_Y(ST_Centroid(hull)) AS y, ST_AsGeoJSON(hull) FROM moves_cluster WHERE cluster_id = "+parseInt(req.params[0])+" AND year = "+req.params[1]);
        for(var i in rows){
            json.push({id: rows[i].cluster_id, path:JSON.parse(rows[i].st_asgeojson), x:rows[i].x, y:rows[i].y});
        }
    }

	res.send(JSON.stringify(json));
}

function slice(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[1] = checkYearParam(req.params[1]);

    if(req.params[0]){
    	var rows = client.querySync("SELECT cluster_id, ST_X(ST_Centroid(hull)) AS x, ST_Y(ST_Centroid(hull)) AS y, ST_AsGeoJSON(hull) FROM moves_cluster WHERE cluster_id = "+parseInt(req.params[0])+" AND year = "+req.params[1]);
        for(var i in rows){
            json.push({id: rows[i].cluster_id, path:JSON.parse(rows[i].st_asgeojson), x:rows[i].x, y:rows[i].y});
        }
    }

	res.send(JSON.stringify(json));
}

function mod_hull(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[1] = checkYearParam(req.params[1]);
    var qa = "";
    if(req.params[1]>0){
        qa = "_"+req.params[1];
    }

    if(req.params[0]){
        var rows = client.querySync("SELECT "+parseInt(req.params[0])+" AS cluster_id, ST_X(ST_Centroid(ST_ConcaveHull(ST_Collect(wkb_geometry),0.99,false))) AS x, ST_Y(ST_Centroid(ST_ConcaveHull(ST_Collect(wkb_geometry),0.99,false))) AS y, ST_AsGeoJSON(ST_ConcaveHull(ST_Collect(wkb_geometry),0.99,false)) FROM "+buildtype+" WHERE moves"+qa+"_cluster = "+parseInt(req.params[0])+" GROUP BY moves"+qa+"_cluster");
        for(var i in rows){
            json.push({id: rows[i].cluster_id, path:JSON.parse(rows[i].st_asgeojson), x:rows[i].x, y:rows[i].y});
        }
    }

	res.send(JSON.stringify(json));
}

function hulls(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);

    var rows = client.querySync("SELECT cluster_id, ST_X(ST_Centroid(hull)) AS x, ST_Y(ST_Centroid(hull)) AS y, ST_AsGeoJSON(hull), ST_AsGeoJSON(ST_Envelope(hull)) AS bb FROM moves_cluster WHERE year = "+req.params[0]);
    for(var i in rows){
        if(JSON.parse(rows[i].st_asgeojson) !== null){
            var d = 0;

            if(rows[i].bb){
                rows[i].bb = JSON.parse(rows[i].bb);
                var c = rows[i].bb.coordinates[0];
                var dx = c[0][0] - c[2][0],
                    dy = c[0][1] - c[2][1];
                    d = Math.sqrt(dx * dx + dy * dy);
            }

            json.push({id: rows[i].cluster_id, path:JSON.parse(rows[i].st_asgeojson), x:rows[i].x, y:rows[i].y, bb:rows[i].bb.coordinates[0], r:d});
        }
    }

	res.send(JSON.stringify(json));
}


function connections(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[2] = checkYearParam(req.params[2]);
    var qa = "", qa1 = "";
    if(req.params[2]>0){
        qa = "_"+req.params[2];
        qa1 = " AND year = "+req.params[2];
    }

    var same = "";
    if(req.params[0] === "notsame"){
         same = " AND cluster"+qa+"_id_1 != cluster"+qa+"_id_2";
    }
    var limit = " HAVING COUNT(*) > "+req.params[1];

    var rows = client.querySync("SELECT COUNT(*) AS count, cluster"+qa+"_id_1 AS id_1, cluster"+qa+"_id_2 AS id_2 FROM moves_connection WHERE cluster"+qa+"_id_1 > 0 AND cluster"+qa+"_id_2 > 0"+same+" "+qa1+" GROUP BY cluster"+qa+"_id_1, cluster"+qa+"_id_2 "+limit);
    for(var i in rows){
        json.push({id_1: rows[i].id_1, id_2: rows[i].id_2, count:parseInt(rows[i].count)});
    }

	res.send(JSON.stringify(json));
}


function clusters(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);

    var rows = client.querySync("SELECT cluster_id, activities_count FROM moves_cluster WHERE hull IS NOT NULL AND year = "+req.params[0]);
    for(var i in rows){
        json.push({id:rows[i].cluster_id, count:parseInt(rows[i].activities_count)});
    }

	res.send(JSON.stringify(json));
}

function network(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = {nodes:[],edges:[]};

    var cluster_ref = [], refs = [];

    req.params[0] = checkYearParam(req.params[0]);
    var qa = "";
    if(req.params[0]>0){
        qa = "_"+req.params[0];
    }

    var rows = client.querySync("SELECT cluster_id, ST_X(ST_Centroid(hull)) AS x, ST_Y(ST_Centroid(hull)) AS y, ST_AsGeoJSON(ST_Envelope(hull)) AS bb FROM moves_cluster WHERE hull IS NOT NULL AND year = "+req.params[0]+" ORDER BY cluster_id");
    for(var i in rows){
        var d = 1;

        if(rows[i].bb){
            rows[i].bb = JSON.parse(rows[i].bb);
            var c = rows[i].bb.coordinates[0];
            var dx = c[0][0] - c[2][0],
                dy = c[0][1] - c[2][1];
                d = Math.sqrt(dx * dx + dy * dy);

            d*=100;
            if(d<1){d=1;}
        }

        rows[i].radius = d;

        cluster_ref[rows[i].cluster_id] = rows[i];
    }

    rows = client.querySync("SELECT COUNT(*) AS count, cluster"+qa+"_id_1 AS id_1, cluster"+qa+"_id_2 AS id_2 FROM moves_connection WHERE cluster"+qa+"_id_1 > 0 AND cluster"+qa+"_id_2 > 0 AND cluster"+qa+"_id_1 != cluster"+qa+"_id_2 AND year = "+req.params[0]+" GROUP BY cluster"+qa+"_id_1, cluster"+qa+"_id_2 HAVING COUNT(*) > 1");
    for(i in rows){
        if(rows[i].id_1 in cluster_ref && rows[i].id_2 in cluster_ref){
            json.edges.push({source: rows[i].id_1, target: rows[i].id_2, count:parseInt(rows[i].count)});
            cluster_ref[rows[i].id_1].haslink = true;
            cluster_ref[rows[i].id_2].haslink = true;
        }
    }

    var ref = [], ref_c = 0, ref_ref = {};
    for(i in cluster_ref){
        if(cluster_ref[i].haslink){
            json.nodes.push(cluster_ref[i]);
            ref[cluster_ref[i].cluster_id] = ref_c;
            ref_c++;
        }
    }

    for(i in json.edges){
        json.edges[i].source = ref[json.edges[i].source];
        json.edges[i].target = ref[json.edges[i].target];
    }

    res.send(JSON.stringify(json));
}

function edges(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);

    var cluster_ref = [], cluster_c = 0;
    var qa = "";
    if(req.params[0]>0){
        qa = "_"+req.params[0];
    }

    var rows = client.querySync("SELECT cluster_id, ST_X(ST_Centroid(hull)) AS x, ST_Y(ST_Centroid(hull)) AS y FROM moves_cluster WHERE hull IS NOT NULL AND year = "+req.params[0]+" ORDER BY cluster_id");
    for(var i in rows){
        cluster_ref[rows[i].cluster_id] = cluster_c;
        cluster_c++;
    }

    rows = client.querySync("SELECT COUNT(*) AS count, cluster"+qa+"_id_1 AS id_1, cluster"+qa+"_id_2 AS id_2 FROM moves_connection WHERE cluster"+qa+"_id_1 > 0 AND cluster"+qa+"_id_2 > 0 AND cluster"+qa+"_id_1 != cluster"+qa+"_id_2 AND year = "+req.params[0]+" GROUP BY cluster"+qa+"_id_1, cluster"+qa+"_id_2 HAVING COUNT(*) > 0");
    for(i in rows){
        if(rows[i].id_1 in cluster_ref && rows[i].id_2 in cluster_ref){
            json.push({source: cluster_ref[rows[i].id_1], target: cluster_ref[rows[i].id_2], count:parseInt(rows[i].count)});
        }
    }

    res.send(JSON.stringify(json));
}

function nodes(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    var json = [];

    req.params[0] = checkYearParam(req.params[0]);

    var rows = client.querySync("SELECT cluster_id, ST_X(ST_Centroid(hull)) AS x, ST_Y(ST_Centroid(hull)) AS y, ST_AsGeoJSON(ST_Envelope(hull)) AS bb FROM moves_cluster WHERE hull IS NOT NULL AND year = "+req.params[0]+" ORDER BY cluster_id");
    for(var i in rows){
        var d = 1;

        if(rows[i].bb){
            rows[i].bb = JSON.parse(rows[i].bb);
            var c = rows[i].bb.coordinates[0];
            var dx = c[0][0] - c[2][0],
                dy = c[0][1] - c[2][1];
                d = Math.sqrt(dx * dx + dy * dy);

            d*=100;
            if(d<1){d=1;}
        }

        json.push({x:rows[i].x, y:rows[i].y, radius:d});
    }

	res.send(JSON.stringify(json));
}


//Setup HTTP Server (to handle external requests / communication)
app.set('port', 10066);

app.get('/locations', locations);
app.get(/^\/network\/(.*)$/, network);
app.get(/^\/edges\/(.*)$/, edges);
app.get(/^\/nodes\/(.*)$/, nodes);
app.get(/^\/clusters\/(.*)$/, clusters);
app.get(/^\/building\/(.*)\/(.*)$/, building);
app.get(/^\/buildings\/(.*)$/, buildings);
app.get(/^\/mod_buildings\/(.*)$/, mod_buildings);
app.get(/^\/hull\/(.*)\/(.*)$/, hull);
app.get(/^\/slice\/(.*)\/(.*)$/, slice);
app.get(/^\/mod_hull\/(.*)\/(.*)$/, mod_hull);
app.get(/^\/hulls\/(.*)$/, hulls);
app.get(/^\/connections\/(.*)\/(.*)\/(.*)$/, connections);
app.get(/^\/activity\/(.*)\/(.*)\/(.*)$/, activity);
app.get(/^\/allactivity\/(.*)\/(.*)$/, allactivity);

http.createServer(app).listen(app.get('port'), function(){
	console.log((new Date()), "Express server listening on port " + app.get('port'));
});
