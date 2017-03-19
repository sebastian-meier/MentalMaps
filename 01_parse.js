/*jshint -W004 */
//STEP #1 - Parsing the data and storing it in a database

// TODO: Integrate data analysis / optimization and re-indexing ?!

//Cluster activities that intersect
var task = "import",
    clusterCount = 2,
    buffer = 0.001,
    area = 1/(1000*1000),
    cBuffer = 0.15,
    cArea = 0.9,
    clustertype = 0,
    buildtype = "re_blocks";

process.argv.forEach(function (val, index, array) {
  if(index === 2){
      task = val;
  }else if(index === 3){
      clustertype = parseInt(val);
  }
});

var fs = require('fs'),
    Client = require('pg-native'),
    moment = require('moment-timezone'),
    timeFormat = "YYYYMMDDTHHmmssZ",
    zone = 'Europe/Amsterdam';

var client,
	pg_conf = {
		database:'sebastianmeier',
		user:'sebastianmeier',
		password:'',
		port:5432,
		host:"localhost",
		ssl:false
	};

client = new Client("postgres://"+pg_conf.user+":"+pg_conf.password+"@"+pg_conf.host+"/"+pg_conf.database);
client.connectSync();

console.log((new Date()), "START");

//Resetting stuff

if(task === "import"){
    client.querySync("TRUNCATE moves_activity");
    client.querySync("TRUNCATE moves_location");
    client.querySync("TRUNCATE moves_connection");
}else if(task === "reindex"){
    client.querySync("UPDATE moves_activity SET cluster = 0, clustered = 0, cluster_2013 = 0, cluster_2014 = 0, cluster_2015 = 0, clustered_2013 = 0, clustered_2014 = 0, clustered_2015 = 0");
    client.querySync("UPDATE moves_connection SET cluster_id_1 = NULL, cluster_id_2 = NULL, cluster_2013_id_1 = NULL, cluster_2014_id_1 = NULL, cluster_2015_id_1 = NULL, cluster_2013_id_2 = NULL, cluster_2014_id_2 = NULL, cluster_2015_id_2 = NULL");
    client.querySync("UPDATE moves_location SET cluster_id = 0, cluster_2013_id = 0, cluster_2014_id = 0, cluster_2015_id = 0");
}

client.querySync("TRUNCATE moves_cluster");
client.querySync("UPDATE "+buildtype+" SET moves_cluster_temp = 0, moves_cluster = 0, moves_count = 0, moves_2013_cluster_temp = 0, moves_2013_cluster = 0, moves_2013_count = 0, moves_2014_cluster_temp = 0, moves_2014_cluster = 0, moves_2014_count = 0, moves_2015_cluster_temp = 0, moves_2015_cluster = 0, moves_2015_count = 0");

console.log((new Date()), "Database reset");

var ranking = {
        walking:1,
        running:2,
        cycling:3,
        transport:4,
        bus:4,
        underground:5,
        airplane:6
};

var years = ["all",2013,2014,2015];

/*
//AVG TRAINING
var avg_step = {
        walking:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE},
        running:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE},
        cycling:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE},
        transport:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE},
        bus:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE},
        underground:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE},
        airplane:{c:0,avg:0,sum:0,max:0,min:Number.MAX_VALUE}
};*/

var avg_training = {
    walking:    { c: 109524,    avg: 0.0004,				sum: 32.10058210940402,     max: 0.12631191996572214,   min: 0 },
    running:    { c: 2063,      avg: 0.0005954801011880268, sum: 1.2284754487508993,    max: 0.008180099677413698,  min: 0 },
    cycling:    { c: 18263,     avg: 0.0012564405706800017, sum: 22.94637414232887,     max: 0.036718384447107164,  min: 0 },
    transport:  { c: 80780,     avg: 0.015327283173409891,  sum: 1238.137934748051,     max: 23.61019543072056,     min: 0 },
    bus:        { c: 43,        avg: 0.013220394203268567,  sum: 0.5684769507405484,    max: 0.28780506805822337,   min: 0 },
    underground:{ c: 4,         avg: 0.036306791744560016,  sum: 0.14522716697824006,   max: 0.08930783840178672,   min: 0 },
    airplane:   { c: 317,       avg: 0.14265569307620185,   sum: 45.22185470515599,     max: 4.490268152983742,     min: 0 }
};

function dist( point1, point2 ){
    return Math.sqrt( Math.pow((point2[0] - point1[0]),2) + Math.pow((point2[1] - point1[1]),2) );
}

function validateLine(line, activity, level){
    var buffer = (avg_training[activity].avg+avg_training[activity].avg*10);
    if(level > 20){
        //These are lines that have small holes
        return line;
    }else{
        var remove;
        if(line.length>1){
            var validation = [];
            var problem = 0;
            for(var i = 0; i < line.length; i++){
                if(i>0){
                    var v = ((dist(line[i], line[i-1])<buffer)?1:0);
                    validation.push(v);
                    if(v<1){problem++;}
                }
            }

            if(problem<1){
                return line;
            }else if(line.length<3){
                //return [];
                return line;
            }else{
                if(problem<2){
                    //Probably start or endpoint
                    if(validation[0]===0){
                        line.splice(1, 1);
                    }else if(validation[validation.length-1]===0){
                        line.splice((line.length-2), 1);
                    }else{
                        //this likely means the route is good eventhough off
                        /*
                        if(line.length > 8){
                            for(i = 0; i<validation.length; i++){
                                if(validation[i]===0){
                                    if(i<4){
                                        line.splice(0, i+1);
                                    }else if((line.length-i)<4){
                                        line.splice(i+1, (line.length-i-1));
                                    }
                                }
                            }
                        }
                        */

                        return line;
                    }
                }else if(problem<3){
                    //Just one outlier
                    remove = false;
                    for(i = 0; i < validation.length; i++){
                        if(i>0){
                            if((validation[i]===0)&&(validation[i-1]===0)){
                                remove = i; break;
                            }
                        }
                    }
                    if(remove){
                        line.splice(remove, 1);
                    }else{
                        //First and last are broken
                        if(validation[0]===0){
                            //line.splice(0, 1);
                        }else if(validation[validation.length-1]===0){
                            //line.splice((line.length-1), 1);

                        }
                        return line;
                    }
                }else{
                    //More Problems
                    if(line.length < problem*2){
                        //line = [];
                        return line;
                    }else{
                        //check if we have at least half a consecutive sequence of numbers
                        var con = 0,
                            goodcon = false;

                        for(i = 0; i < validation.length; i++){
                            if(validation[i]===1){
                                con++;
                            }else{
                                if(con>=line.length/2){
                                    goodcon = true;
                                }
                                con = 0;
                            }
                        }

                        if(goodcon){
                            while(problem>0){
                                if(validation[0]===0){
                                    line.splice(0, 1);
                                    validation.splice(0,1);
                                }else if(validation[validation.length-1]===0){
                                    validation.splice((validation.length-1),1);
                                    line.splice((line.length-1), 1);
                                }else{
                                    remove = false;
                                    for(var p = problem; p>0; p--){
                                        for(i = 0; i < validation.length; i++){
                                            if(i>p){
                                                var allbad = true;
                                                for(var pp = 0; pp<p; pp++){
                                                    if(validation[i-pp]!==0){
                                                        allbad = false;
                                                    }
                                                }
                                                if(allbad){
                                                    remove = i; break;
                                                }
                                            }
                                        }
                                        if(remove){
                                            validation.splice(remove-(p-1), p);
                                            line.splice(remove-(p-1), p); break;
                                        }
                                    }
                                }
                                problem--;
                            }
                        }else{
                            line = [];
                        }
                    }
                }
                return validateLine(line, activity, level+1);
            }
        }else{
            return [];
        }
    }
}

if(task === "import"){
    fs.readFile('./data/storyline_2015.geojson', 'utf8', function (err,data) {
        if (err) {return console.log(err);}
        console.log("file loaded");
        var geojson = JSON.parse(data),
            objects = [],
            obj,rows,pgdata;

        for(var i in geojson.features){
            var feature = geojson.features[i];
            switch(feature.geometry.type){
                case 'MultiLineString':
                    obj = {
                        type:'activity',
                        activity:0,
                        endTime:moment.tz(feature.properties.endTime, zone),
                        startTime:moment.tz(feature.properties.startTime, zone),
                        path:'',
                        objs:[]
                    };
                    for(var a = 0; a < feature.properties.activities.length; a++){
                        var activity = feature.properties.activities[a];
                        var linestring = '';
                        var geometry = validateLine(feature.geometry.coordinates[a], activity.activity, 0);  //validateLine(feature.geometry.coordinates[a], activity.activity, 0); //feature.geometry.coordinates[a];
                        for(var g = 0; g < geometry.length; g++){
                            if(linestring!==''){ 
                            	linestring += ','; 
                            }

                            if(obj.path !== ''){
                                obj.path += ",";
                            }

                            linestring += geometry[g][0]+' '+geometry[g][1];
                            obj.path += geometry[g][0]+' '+geometry[g][1];

                            //AVG TRAINING
                            //if(!first){
                            //    var d = dist(points[points.length-1], points[points.length-2]);
                            //    avg_step[activity.activity].c++;
                            //    avg_step[activity.activity].sum+=d;
                            //    if(d>avg_step[activity.activity].max){avg_step[activity.activity].max = d;}
                            //    if(d<avg_step[activity.activity].min){avg_step[activity.activity].min = d;}
                            //    avg_step[activity.activity].avg = avg_step[activity.activity].sum / avg_step[activity.activity].c;
                            //}

                        }
                        linestring='LINESTRING('+linestring+')';
                        if(geometry.length<1){
                            pgdata = [
                                activity.activity,
                                activity.group,
                                obj.startTime.format(timeFormat),
                                obj.endTime.format(timeFormat),
                                obj.startTime.format("YYYY")
                            ];
                            linestring = '';
                            rows = client.querySync("INSERT INTO moves_activity (activity, \"group\", starttime, endtime, \"year\")VALUES($1::text, $2::text, $3::timestamp AT TIME ZONE 'Europe/Amsterdam', $4::timestamp AT TIME ZONE 'Europe/Amsterdam', $5::integer) RETURNING id", pgdata);
                        }else{
                            pgdata = [
                                activity.activity,
                                activity.group,
                                linestring,
                                obj.startTime.format(timeFormat),
                                obj.endTime.format(timeFormat),
                                obj.startTime.format("YYYY")
                            ];
                            rows = client.querySync("INSERT INTO moves_activity (activity, \"group\", geom, starttime, endtime, \"year\")VALUES($1::text, $2::text, ST_GeomFromText($3, 4326), $4::timestamp AT TIME ZONE 'Europe/Amsterdam', $5::timestamp AT TIME ZONE 'Europe/Amsterdam', $6::integer) RETURNING id", pgdata);
                        }
                        obj.objs.push({
                            activity:activity.activity,
                            group:activity.group,
                            id:rows[0].id,
                            path:linestring,
                            startTime:obj.startTime.format(timeFormat),
                            endTime:obj.endTime.format(timeFormat),
                            year:obj.startTime.format("YYYY")
                        });
                        if(activity.activity in ranking){
                            if(ranking[activity.activity]>obj.activity){
                                obj.activity = ranking[activity.activity];
                            }
                        }else{
                            console.log('Unknown activity', activity.activity);
                        }
                    }
                    obj.path = 'LINESTRING('+obj.path+")";
                    if(obj.path === "LINESTRING()"){obj.path = false;}
                    objects.push(obj);
                break;
                case 'Point':
                    obj = {
                        type:'point',
                        id:false,
                        endTime:moment.tz(feature.properties.endTime, zone),
                        startTime:moment.tz(feature.properties.startTime, zone),
                        year:moment.tz(feature.properties.startTime, zone).format(timeFormat),
                        path:'POINT('+feature.geometry.coordinates[0]+' '+feature.geometry.coordinates[1]+')'
                    };

                    pgdata = [
                        feature.properties.place.name,
                        feature.properties.place.type,
                        feature.properties.place.id,
                        obj.path
                    ];

                    rows = client.querySync("SELECT id FROM moves_location WHERE mid = $1::integer", [feature.properties.place.id]);
                    if(rows.length >= 1){
                        obj.id = rows[0].id;
                    }else{
                        rows = client.querySync("INSERT INTO moves_location (name, type, mid, geom)VALUES($1::text, $2::text, $3::integer, ST_GeomFromText($4, 4326)) RETURNING id", pgdata);
                        obj.id = rows[0].id;
                    }
                    objects.push(obj);

                    if(objects.length > 2){
                        if((objects[objects.length-2].type === "activity")&&(objects[objects.length-3].type === "point")){
                            var diff1 = Math.abs(objects[objects.length-3].endTime.diff(objects[objects.length-2].startTime));
                            var diff2 = Math.abs(objects[objects.length-2].endTime.diff(objects[objects.length-1].startTime));
                            if(diff1 < 60000 && diff2 < 60000){
                                if(objects[objects.length-2].path){
                                    pgdata = [
                                        ((objects[objects.length-3].id<objects[objects.length-1].id)?objects[objects.length-3].id:objects[objects.length-1].id),
                                        ((objects[objects.length-3].id<objects[objects.length-1].id)?objects[objects.length-1].id:objects[objects.length-3].id),
                                        objects[objects.length-2].activity,
                                        objects[objects.length-2].path,
                                        objects[objects.length-2].startTime.format("YYYY")
                                    ];
                                    rows = client.querySync("INSERT INTO moves_connection (location_id_1, location_id_2, activity, geom, year)VALUES($1::integer, $2::integer, $3::integer, ST_GeomFromText($4, 4326), $5::integer) RETURNING id", pgdata);
                                }
                            }
                        }
                    }
                break;
                default:
                    console.log('Unknown type', geojson.features[i].geometry.type);
                break;
            }
        }

        console.log((new Date()), "database filled");

        //Tag data that is inside Berlin
        client.querySync("UPDATE moves_location SET in_berlin = 1 WHERE EXISTS ( SELECT 1 FROM lor_bezirk WHERE moves_location.geom && lor_bezirk.geom AND ST_Intersects(moves_location.geom, lor_bezirk.geom))");
        client.querySync("UPDATE moves_activity SET in_berlin = 1 WHERE EXISTS ( SELECT 1 FROM lor_bezirk WHERE moves_activity.geom && lor_bezirk.geom AND ST_Intersects(moves_activity.geom, lor_bezirk.geom))");
        client.querySync("UPDATE moves_connection SET in_berlin = 0 FROM moves_location WHERE moves_connection.location_id_1 = moves_location.id AND moves_location.in_berlin = 0");
        client.querySync("UPDATE moves_connection SET in_berlin = 0 FROM moves_location WHERE moves_connection.location_id_2 = moves_location.id AND moves_location.in_berlin = 0");

        console.log((new Date()), "berlin tagged");

        buildCluster(clustertype);
    });
}else{
    buildCluster(clustertype);
}

function buildCluster(type){

    var qa1 = "",
        qa2 = "",
        qa3 = "",
        qa4 = "",
        qa5 = "";

    if(years[type]!=="all"){
        qa1 = " AND year = "+years[type]+" ";
        qa2 = "_"+years[type];
        qa3 = ", year";
        qa4 = " WHERE year = "+years[type];
        qa5 = ", "+years[type];
    }

    console.log(buffer,area);

    //Select starting point
    var row = client.querySync("SELECT id, ST_AsText(geom) AS geo, cluster"+qa2+", clustered"+qa2+" FROM moves_activity "+
                                    "WHERE in_berlin = 1 AND activity = 'walking'"+qa1+" ORDER BY id ASC LIMIT 1");

    while(row.length>=1){
        //Assign current cluster
        client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer, clustered"+qa2+" = 1 "+
                            "WHERE id = $2::integer", [clusterCount, row[0].id]);

        //Assign cluster id to interesecting activities
        //client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer WHERE in_berlin = 1 AND NOT cluster"+qa2+" = $2::integer AND activity = 'walking' AND clustered"+qa2+" = 0 AND ST_Crosses(geom, ST_GeomFromText($3, 4326)) AND ST_Area(ST_Intersection( ST_Buffer(ST_GeomFromText($4, 4326), "+buffer+", 'endcap=round join=round'), st_buffer(geom, "+buffer+", 'endcap=round join=round') ))/ST_Area(ST_Buffer(geom, "+buffer+", 'endcap=round join=round')) > "+area, [clusterCount, clusterCount, row[0].geo, row[0].geo]);
        client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer "+
                            "WHERE in_berlin = 1 AND NOT cluster"+qa2+" = $2::integer AND activity = 'walking' AND clustered"+qa2+" = 0 "+
                            qa1+
                            "AND ST_Intersects(ST_Buffer(geom, "+buffer+", 'endcap=round join=round'), St_Buffer(ST_GeomFromText($3, 4326), "+buffer+", 'endcap=round join=round')) "+
                            "AND ST_Area(ST_Intersection( "+
                                "ST_Buffer(ST_GeomFromText($4, 4326), "+buffer+", 'endcap=round join=round'), "+
                                "ST_Buffer(geom, "+buffer+", 'endcap=round join=round') )) > "+area+" "+
                            "AND ST_Area(ST_Intersection( "+
                                "ST_Buffer(ST_GeomFromText($5, 4326), "+cBuffer+", 'endcap=round join=round'), "+
                                "ST_Buffer(geom, "+cBuffer+", 'endcap=round join=round') )) "+
                            "/ "+
                            "ST_Area(ST_Buffer(geom, "+buffer+", 'endcap=round join=round')) > "+cArea,
                        [clusterCount, clusterCount, row[0].geo, row[0].geo, row[0].geo]);

        /*client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer "+
                            "WHERE in_berlin = 1 AND NOT cluster"+qa2+" = $2::integer AND activity = 'walking' AND clustered"+qa2+" = 0 "+
                            "AND ST_Crosses(geom, ST_GeomFromText($3, 4326)) "+
                            "AND ST_Area(ST_Intersection( "+
                                "ST_Buffer(ST_GeomFromText($4, 4326), "+buffer+", 'endcap=round join=round'), "+
                                "ST_Buffer(geom, "+buffer+", 'endcap=round join=round') )) "+
                            "/ "+
                            "ST_Area(ST_Buffer(geom, "+buffer+", 'endcap=round join=round')) > "+area,
                        [clusterCount, clusterCount, row[0].geo, row[0].geo]);*/

        var rows = client.querySync("SELECT id, ST_AsText(geom) AS geo, cluster"+qa2+", clustered"+qa2+" FROM moves_activity "+
                                        "WHERE cluster"+qa2+" = $1::integer AND activity = 'walking' AND in_berlin = 1 AND clustered"+qa2+" = 0 "+qa1+
                                        "ORDER BY id ASC LIMIT 1",
                                        [clusterCount]);

        while(rows.length >= 1){
            client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer, clustered"+qa2+" = 1 WHERE id = $2::integer", [clusterCount, rows[0].id]);

            client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer "+
                                "WHERE in_berlin = 1 AND NOT cluster"+qa2+" = $2::integer AND activity = 'walking' AND clustered"+qa2+" = 0 "+
                                qa1+
                                "AND ST_Intersects(ST_Buffer(geom, "+buffer+", 'endcap=round join=round'), St_Buffer(ST_GeomFromText($3, 4326), "+buffer+", 'endcap=round join=round')) "+
                                "AND ST_Area(ST_Intersection( "+
                                    "ST_Buffer(ST_GeomFromText($4, 4326), "+buffer+", 'endcap=round join=round'), "+
                                    "ST_Buffer(geom, "+buffer+", 'endcap=round join=round') )) > "+area+" "+
                                "AND ST_Area(ST_Intersection( "+
                                    "ST_Buffer(ST_GeomFromText($5, 4326), "+cBuffer+", 'endcap=round join=round'), "+
                                    "ST_Buffer(geom, "+cBuffer+", 'endcap=round join=round') )) "+
                                "/ "+
                                "ST_Area(ST_Buffer(geom, "+buffer+", 'endcap=round join=round')) > "+cArea,
                            [clusterCount, clusterCount, rows[0].geo, rows[0].geo, row[0].geo]); //TODO: CHECK HOW IT DIFFERS IF WE use row/rows

            /*
            client.querySync("UPDATE moves_activity SET cluster"+qa2+" = $1::integer "+
                                "WHERE in_berlin = 1 AND activity = 'walking' AND NOT cluster"+qa2+" = $2::integer AND clustered"+qa2+" = 0 "+
                                "AND ST_Crosses(geom, ST_GeomFromText($3, 4326)) "+
                                "AND ST_Area(ST_Intersection( "+
                                    "ST_Buffer(ST_GeomFromText($4, 4326), "+buffer+", 'endcap=round join=round'), "+
                                    "ST_Buffer(geom, "+buffer+", 'endcap=round join=round') ))"+
                                "/"+
                                    "ST_Area(ST_Buffer(geom, "+buffer+", 'endcap=round join=round')) > "+area,
                            [clusterCount, clusterCount, rows[0].geo, row[0].geo]);
                            */

            rows = client.querySync("SELECT id, ST_AsText(geom) AS geo, cluster"+qa2+", clustered"+qa2+" FROM moves_activity "+
                                        "WHERE activity = 'walking' AND cluster"+qa2+" = $1::integer AND in_berlin = 1 AND clustered"+qa2+" = 0 "+qa1+
                                        "ORDER BY id ASC LIMIT 1",
                                        [clusterCount]);

        }

        row = client.querySync("SELECT id, ST_AsText(geom) AS geo, cluster"+qa2+", clustered"+qa2+" FROM moves_activity "+
                                    "WHERE in_berlin = 1 "+qa1+" AND activity = 'walking' AND clustered"+qa2+" = 0 ORDER BY id ASC LIMIT 1");

        clusterCount++;
    }

    console.log((new Date()), "clustered "+qa2);

    //Check for building intersections
    client.querySync("UPDATE "+buildtype+" SET moves"+qa2+"_count = (SELECT COUNT(*) FROM moves_activity WHERE in_berlin = 1 AND activity = 'walking'"+qa1+" AND ST_INTERSECTS(geom, geom_buffer))");

    console.log((new Date()), "buildings referenced");

    //Organize clusters in separate table
    client.querySync("INSERT INTO moves_cluster (cluster_id, activities, activities_count"+qa3+") SELECT cluster"+qa2+", ST_COLLECT(geom), COUNT(*)"+qa5+" FROM moves_activity WHERE cluster"+qa2+" > 1"+qa1+" GROUP BY cluster"+qa2);

    console.log((new Date()), "clusteres stored");

    var rows = client.querySync("SELECT cluster_id, ST_AsText(activities) AS geom FROM moves_cluster"+qa4+" ORDER BY activities_count DESC");
    for(var i = 0; i<rows.length; i++){
        //Fast envelope precheck
        client.querySync("UPDATE "+buildtype+" SET moves"+qa2+"_cluster_temp = $1::integer FROM moves_cluster WHERE moves"+qa2+"_cluster_temp = 0 AND moves"+qa2+"_count > 0 AND cluster_id = $2::integer AND ST_INTERSECTS(geom_buffer, ST_Envelope(ST_GeomFromText($3, 4326)))", [rows[i].cluster_id, rows[i].cluster_id, rows[i].geom]);
        //More precise check
        client.querySync("UPDATE "+buildtype+" SET moves"+qa2+"_cluster = $1::integer FROM moves_cluster WHERE moves"+qa2+"_cluster_temp = $2::integer AND cluster_id = $3::integer AND ST_INTERSECTS(geom_buffer, ST_GeomFromText($4, 4326))", [rows[i].cluster_id, rows[i].cluster_id, rows[i].cluster_id, rows[i].geom]);
    }

    console.log((new Date()), "clusteres reassigned");

    client.querySync("UPDATE moves_cluster SET hull = (st_nullableconcavehull((SELECT ST_Collect(wkb_geometry) FROM "+buildtype+" WHERE moves"+qa2+"_cluster = cluster_id GROUP BY moves"+qa2+"_cluster), 0.99, false))"+qa4);

    /*
    CREATE OR REPLACE FUNCTION public.st_nullableconcavehull(param_geom geometry, param_pctconvex double precision, param_allow_holes boolean DEFAULT false)
      RETURNS geometry AS
    $BODY$
        DECLARE
        BEGIN
                RETURN public.st_concavehull(param_geom,param_pctconvex,param_allow_holes);
            EXCEPTION when others then IF param_pctconvex < 1 THEN RETURN public.st_nullableconcavehull(param_geom,(param_pctconvex+0.01),param_allow_holes); ELSE RETURN public.st_convexhull(param_geom); END IF;
        END;
    $BODY$
      LANGUAGE plpgsql IMMUTABLE STRICT
      COST 100;
    ALTER FUNCTION public.st_nullableconcavehull(geometry, double precision, boolean)
      OWNER TO sebastianmeier;
    COMMENT ON FUNCTION public.st_nullableconcavehull(geometry, double precision, boolean) IS 'args: geomA, target_percent, allow_holes=false - The concave hull of a geometry represents a possibly concave geometry that encloses all geometries within the set. You can think of it as shrink wrapping.';
    */

    console.log((new Date()), "cluster hulls");

    client.querySync("UPDATE moves_location SET cluster"+qa2+"_id = moves_cluster.cluster_id FROM moves_cluster WHERE moves_location.in_berlin = 1"+qa1+" AND ST_WITHIN(moves_location.geom, moves_cluster.hull)");

    console.log((new Date()), "assign cluster to locations");

    client.querySync("UPDATE moves_connection SET cluster"+qa2+"_id_1 = moves_location.cluster"+qa2+"_id FROM moves_location WHERE moves_location.id = moves_connection.location_id_1");
    client.querySync("UPDATE moves_connection SET cluster"+qa2+"_id_2 = moves_location.cluster"+qa2+"_id FROM moves_location WHERE moves_location.id = moves_connection.location_id_2");

    console.log((new Date()), "assign cluster to connections");

    clustertype++;
    if(clustertype<years.length){
        buildCluster(clustertype);
    }else{
        console.log("all done");
        process.exit();
    }
}

//buildCluster(clustertype);
