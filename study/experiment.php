<html>
<head>
	<meta content="text/html; charset=UTF-8" http-equiv="content-type">
	<title></title>
	<link rel="stylesheet" href="../libs/d3.slider.css" />  
	<style type="text/css">
		html,body{
			width:100%;
			height:100%;
			margin:0;
			padding:0;
			border:0;
			font-family: Helvetica, Arial, sans-serif;
		}

		img{
			float:left;
		}

		span{
			display: block;
			width:100%;
		}

		#log img{
			float: none;
			height:200px;
			width:auto;
		}

		button{
			font-size: 16px;
			padding:10px 15px;
			margin-left:20px;
		}

		#experiment_container{
			display: none;
		}

		#bye_container, #post_survey{
			display: none;
		}

		#map{
			width:100%;
			height:400px;
		}

		#question_container, #map_container{
			width:50%;
			float:left;
			height:400px;
		}

		#question_container{
			padding-top:20px;
		}

		#map_container{
			visibility: hidden;
		}

		#step_2, #step_3, #step_4{
			display: none;
		}

		#slider{
			height:20px;
			width:200px;
			margin:20px;
			margin-bottom:50px;
		}

		p{
			padding:20px;
			max-width:500px;
		}

		h1{
			padding:20px;
		}

		strong{
			padding:20px;
		}

		span.small{
			display: block;
			padding:20px;
			font-style:italic;
			font-size:14px;
		}

		#survey_block_2,
		#survey_block_3,
		#survey_block_4,
		#survey_block_5,
		#survey_block_6{
			display: none;
		}
	</style>
</head>
<body>
	<div id="intro_container">
		<h1>Welcome </h1>
		<p>
			Thanks for taking part in this little survey.<br /><br />
			The results will be processed anonymously.<br /><br />
			The experiment will take approximately 15 to 20 minutes.<br /><br />
			In the experiment you will be shown 22 locations. 
			For each location you will first see a Google StreetView. You are then asked if you remember the location.
			You are allowed to use Google StreetView to rotate and explore the view, but you cannot change the location.
			If you do not know the location, you can proceed to the next. 
			If you remember the location, you are asked to identify it on a map. Simply click on the location, a marker will indicate your choice, you can change the location as often as you like.
			Afterwards you are asked how well you know the location. You will then proceed with the next location.<br /><br />
			Please finish the test in one run.<br /><br />
			<strong>Note: Sometimes Google StreetView images might be outdated or even pixelated. Don't worry, in those cases just click "no", the test will indicate the location on the map and you can proceed with the test.</strong>
		</p>
		<button id="intro_button" type="button">Please wait while the data is loading...</button>
	</div>
	<div id="experiment_container">
		<div id="map"></div>
		<div id="question_container">
			<div id="step_1">
				<strong>Do you know the location shown in the Panorama?</strong><br />
				<span class="small">You can rotate and pan the panorma, but not change the position.</span>
				<button id="do_you_know_yes" type="button">Yes</button>
				<button id="do_you_know_no" type="button">No</button>
			</div>
			<div id="step_2">
				<strong>Please try to locate the location on the map on the right.</strong><br />
				<span class="small">Simply click on the map to make a selection. You can freely zoom and pan.</span>
				<button id="map_continue" type="button">Continue</button>
				<button id="map_continue_no" type="button">I can't locate the area on the map</button>
			</div>
			<div id="step_3">
				<span class="small" id="Feedback"></span>
				<strong>How well do you know the location indicated by the green marker?</strong><br />
				<span class="small">
					0 = I don't know the location<br /><br />
					1 = I have fragmentary memories of the location<br />
					6 = I know the location like the back of my hand</span>
				<div id="slider"></div>
				<button id="slider_continue" type="button">Continue</button>
			</div>
			<div id="step_4">
				<button id="experiment_button" type="button">Next</button>
			</div>
		</div>
		<div id="map_container">
		</div>
	</div>
	<div id="post_survey">
		<h1>Almost done.</h1>
		<div id="survey_block_1">
			<p>Do you live in Berlin?</p>
			<button id="berlin_yes" type="button">Yes</button>
			<button id="berlin_no" type="button">No</button>
		</div>
		<div id="survey_block_2">
			<p>How many years have you been living in Berlin?</p>
			<input type="text" id="berlin_years" />
			<button id="berlin_years_continue" type="button">Continue</button>
		</div>
		<div id="survey_block_3">
			<p>Do you live in greater metropolitan area of Berlin (e.g. Potsdam)?</p>
			<button id="metro_yes" type="button">Yes</button>
			<button id="metro_no" type="button">No</button>
		</div>
		<div id="survey_block_4">
			<p>For how many years have you been living there?</p>
			<input type="text" id="metro_years" />
			<button id="metro_years_continue" type="button">Continue</button>
		</div>
		<div id="survey_block_5">
			<p>How many days per week do you spend in Berlin?</p>
			<input type="text" id="berlin_visit" />
			<button id="berlin_visit_continue" type="button">Continue</button>
		</div>
		<div id="survey_block_6">
			<button id="survey_done" type="button">Continue</button>
		</div>
	</div>
	<div id="bye_container">
		<h1>That's it</h1>
		<p>Thanks for participating.</p>
	</div>
	<script src="../libs/jquery-1.11.1.min.js" charset="utf-8" type="text/javascript" ></script>
	<script src="../libs/d3.v3.min.js" charset="utf-8" type="text/javascript" ></script>
	<script src="../libs/d3.slider.js" charset="utf-8" type="text/javascript" ></script>
	<script src="../libs/turf.min.js" charset="utf-8" type="text/javascript" ></script>
	<script type="text/javascript">
		var participant = '<?php echo $_GET["key"]; ?>',
			data, 
			keys = [],
			loaded = false,
			initiated = false,
			slide_value = null,
			test = 0,
			resultItem = null,
			center,
			place,
			marker = false,
			amarker = false,
			update_timeout = null,
			map,
			marker_place = {lat:0,lng:0},
			panorama,
			results = {
				berlin:false,
				in_berlin:0,
				metro:false,
				in_metro:0,
				metro_berlin:0,
				tests:[]
			},
			webService = null,
			myStyles = [
				{
					featureType: "poi",
					elementType: "labels",
					stylers: [
						{ visibility: "off" }
					]
				}/*,
				{
					featureType: "transit",
					elementType: "labels.text",
					stylers: [
						{ visibility: "off" }
					]
				}*/
			];

		var date = new Date();
		var start = date.getTime();

		function initMap(){
			//webService = new google.maps.StreetViewService();  
			initiated = true;
			checkToContinue();
		}

		//d3.select('#intro_container h1').text('Welcome '+(participant.split("_"))[1]);

		d3.json('./selections/streetview/'+participant+'.json', function(err, json){
			data = json;

			for(var i = 0; i<data.length; i++){
				keys.push(''+i+'');
			}

			shuffle(keys);

			loaded = true;
			checkToContinue();
		});

		d3.select('#do_you_know_no').on('click', function(){
			var date = new Date();
			resultItem.times.push(date.getTime());
			resultItem.known = true;
			resultItem.marked = {x:0,y:0};

			d3.select('#step_1').style('display','none');
			d3.select('#step_3').style('display','block');

			d3.select('#map_container').style('visibility','visible');
			d3.select('#Feedback').text('The location is here.');

			amarker.setPosition(place);
			amarker.setMap(map);
			map.setCenter(place);

			buildSlider();
		});

		d3.select('#do_you_know_yes').on('click', function(){
			d3.select('#step_1').style('display','none');
			d3.select('#step_2').style('display','block');
			d3.select('#map_container').style('visibility','visible');
			var date = new Date();
			resultItem.times.push(date.getTime());
		});

		d3.select('#map_continue').on('click', function(){
			var mp = marker.getPosition();
			if(mp.lat() == 0 && mp.lng() == 0){
				alert("Please mark the location on the map.");
			}else{

				var date = new Date();
				resultItem.times.push(date.getTime());
				resultItem.known = true;
				resultItem.marked = {x:mp.lng(),y:mp.lat()};

				d3.select('#step_2').style('display','none');
				d3.select('#step_3').style('display','block');

				buildSlider();

				var p1 = turf.point([place.lng,place.lat]),
					p2 = turf.point([mp.lng(),mp.lat()]);

				var dist = turf.distance(p1, p2, 'kilometers');

				if(dist < 0.050){
					//perfect, in range
					d3.select('#Feedback').text('Perfect, you matched the location.');
				}else if(dist < 0.150){
					//almost
					d3.select('#Feedback').text('Almost the exact location.');
				}else if(dist < 0.500){
					//a little off
					d3.select('#Feedback').text('Your location was just a little off.');
				}else if(dist < 1.000){
					//right direction
					d3.select('#Feedback').text('Right direction but a bit off.');
				}else{
					//
					d3.select('#Feedback').text('Here is the exact location.');
				}

				amarker.setPosition(place);
				amarker.setMap(map);
				map.setCenter(place);

			}
		});

		d3.select('#map_continue_no').on('click', function(){
			var date = new Date();
			resultItem.times.push(date.getTime());
			resultItem.known = true;
			resultItem.marked = {x:0,y:0};

			d3.select('#step_2').style('display','none');
			d3.select('#step_3').style('display','block');

			d3.select('#Feedback').text('The location is here.');

			amarker.setPosition(place);
			amarker.setMap(map);
			map.setCenter(place);

			buildSlider();
		});

		d3.select('#slider_continue').on('click', function(){
			var date = new Date();
			resultItem.times.push(date.getTime());
			resultItem.range = slide_value;

			d3.select('#step_3').style('display','none');
			d3.select('#step_4').style('display','block');
		});

		function buildSlider(){
			slide_value = 0;
			d3.selectAll('#slider *').remove();
			d3.select('#slider').call(d3.slider().value(0).axis(d3.svg.axis().orient("top").ticks(7)).min(0).max(6).step(1).on("slide", function(evt, value) {
  				slide_value = value;
			}));	
		}    	

		function shuffle(a) {
			var j, x, i;
			for (i = a.length; i; i--) {
				j = Math.floor(Math.random() * i);
				x = a[i - 1];
				a[i - 1] = a[j];
				a[j] = x;
			}
		}

		function checkToContinue(){
			if(loaded && initiated){
				d3.select('#intro_button').text('Continue »');
			}
		}

		d3.select('#intro_button').on('click', function(){
			if(loaded && initiated){
				d3.select('#intro_container').style('display','none');
				d3.select('#experiment_container').style('display','block');
				
				place = {lat: data[keys[test]].sy, lng: data[keys[test]].sx};
				center = {lat: 52.5068442490908, lng: 13.4246698478768};
			
				panorama = new google.maps.StreetViewPanorama(
					document.getElementById('map'), {
						position: place,
						pov: {
							heading: 34,
							pitch: 0
						},
						addressControl:false,
						linksControl: false,
						panControl: false,
						enableCloseButton: false,
						disableDefaultUI:true,
						disableDoubleClickZoom:false,
						scrollWheel:false,
						showRoadLabels:false,
						zoomControl:false
					});

				panorama.addListener('position_changed', function() {
					var p = panorama.getPosition();
					if(p.lat() != place.lat || p.lng() != place.lng){
						panorama.setPosition(place);	
					}
				});

				map = new google.maps.Map(
					document.getElementById('map_container'), {
						center: center,
						zoom:12,
						mapTypeId: google.maps.MapTypeId.ROADMAP,
    					styles: myStyles,
    					disableDefaultUI: true
					});

				marker = new google.maps.Marker({
					position: {lat:0,lng:0},
					map: null
				});

				amarker = new google.maps.Marker({
					position: {lat:0,lng:0},
					icon:'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
					map: null
				});

				google.maps.event.addListener(map, 'click', function(e) {
					marker_place = e.latLng;
					update_timeout = setTimeout(function(){
						addMarker();
					}, 200);
				});

				google.maps.event.addListener(map, 'dblclick', function(e) {
					clearTimeout(update_timeout);
				});

				loadTest();
			}
		});

		function addMarker(){
			marker.setPosition(marker_place);
			marker.setMap(map);
			map.panTo(marker_place);
		}

		function loadTest(){
			var date = new Date();

			resultItem = {
				times : [
					date.getTime()
				],
				known:false,
				marked:false,
				range:0
			};

			place = {lat: data[keys[test]].sy, lng: data[keys[test]].sx};
			panorama.setPosition(place);
		}

		d3.select('#experiment_button').on('click', function(){
			nextTest();
		});

		function nextTest(){
			marker_place = {lat:0,lng:0};
			marker.setPosition({lat:0,lng:0});
			marker.setMap(null);
			amarker.setPosition({lat:0,lng:0});
			amarker.setMap(null);
			map.setZoom(12);
			map.setCenter(center);


			var date = new Date();
			resultItem.times.push(date.getTime());
			results.tests.push(resultItem);

			d3.select('#step_1').style('display','block');
			d3.selectAll('#step_4, #step_2, #step_3').style('display','none');
			d3.select('#map_container').style('visibility','hidden');

			test++;
			if(test<data.length){
				loadTest();
			}else{

				d3.select('#experiment_container').style('display','none');
				d3.select('#post_survey').style('display','block');

			}
		}

		d3.select('#berlin_yes').on('click', function(){
			results.berlin = true;
			d3.select('#survey_block_1').style('display', 'none');
			d3.select('#survey_block_2').style('display', 'block');
		});

		d3.select('#berlin_years_continue').on('click', function(){
			results.in_berlin = document.getElementById("berlin_years").value;
			d3.select('#survey_block_2').style('display', 'none');
			d3.select('#survey_block_6').style('display', 'block');
		});

		d3.select('#berlin_no').on('click', function(){
			results.berlin = false;
			d3.select('#survey_block_1').style('display', 'none');
			d3.select('#survey_block_3').style('display', 'block');
		});

		d3.select('#metro_no').on('click', function(){
			results.metro = false;
			d3.select('#survey_block_3').style('display', 'none');
			d3.select('#survey_block_6').style('display', 'block');
		});

		d3.select('#metro_yes').on('click', function(){
			results.metro = true;
			d3.select('#survey_block_3').style('display', 'none');
			d3.select('#survey_block_4').style('display', 'block');
		});

		d3.select('#metro_years_continue').on('click', function(){
			results.in_metro = document.getElementById("metro_years").value;
			d3.select('#survey_block_4').style('display', 'none');
			d3.select('#survey_block_5').style('display', 'block');
		});

		d3.select('#berlin_visit_continue').on('click', function(){
			results.metro_berlin = document.getElementById("berlin_visit").value;
			d3.select('#survey_block_5').style('display', 'none');
			d3.select('#survey_block_6').style('display', 'block');
		});

		d3.select('#survey_done').on('click', function(){
			d3.select('#post_survey').style('display', 'none');
			$.post( "save.php", { file: "result_"+participant+".json", results: JSON.stringify(results) })
				.done(function( data ) {
					d3.select('#bye_container').style('display', 'block');
				});
		});

	</script>
	<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCA8cP_PyKP16JxZNcSr40_3t7CUbU6oCc&callback=initMap"></script>
 </body>
</html>


