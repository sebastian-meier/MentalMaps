var overpass = require('query-overpass'),
    fs = require('fs');

var bbox = '(52.3382365501687,13.0882073999633,52.6754519480129,13.7611322957904)';

var roads = [
        ["highway","motorway"], /*Autobahn*/
        ["highway","motorway_link"],
        ["highway","trunk"], /*Schnellstraße / Stadtautobahn*/
        ["highway","trunk_link"],
        ["highway","primary"], /*Zubringer*/
        ["highway","primary_link"],
        ["highway","secondary"], /*Hauptverkehrsachsen*/
        ["highway","secondary_link"],
        ["highway","tertiary"], /*Hauptstraßen*/
        ["highway","unclassified"], /*Kleine Hauptstraße*/
        ["highway","residential"], /*Anwohnerstraßen*/
        ["highway","service"], /*Spezialstraßen*/
        ["highway","living_street"] /*Anliegerstraße*/
    ];

var query = '[out:json];(';
	//query += 'relation["boundary"="administrative"]'+bbox+';>;';
	//query += 'relation["highway"="motorway"]'+bbox+';>;';
	//query += 'node["highway"]'+bbox+';>;';

	for(var r = 0; r<roads.length; r++){
		query += 'way["highway"="'+roads[r][1]+'"]'+bbox+';>;';
	}

	//query += 'relation["highway"]'+bbox+';>;';
	query += ');out;';

overpass(query, function(err, data){
    if(err){
        console.log(query);
        console.log(err);
    }else{
        console.log(query);

        var outputFilename = "streets.min.geojson";
        fs.writeFile(outputFilename, JSON.stringify(data), function(err) {
            console.log("done");
        });
    }
});