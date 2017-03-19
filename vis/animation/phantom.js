"use strict";
var page = require('webpage').create(),
    system = require('system'),
    address, output, size;

var count = 0,
	url = 'http://sites:8888/work@beanstalk/trunk/prjcts/mentalmaps/vis/minimize_ani.html';

page.viewportSize = { width: 1920, height: 1080 };
page.clipRect = { top: 0, left: 0, width: 1920, height: 1080 };

page.onCallback = function(data) {
	if(data.msg == "render"){
		var doy = "process";
		//console.log("snap/"+doy+"/activity_"+doy+"_"+count+".png");
		page.render("snap/"+doy+"/activity_"+doy+"_"+count+".png");
		count++;
		setTimeout(drawAgain, 1);
	}else if(data.msg == "exit"){
		phantom.exit();
	}
};

page.open(url, function (status) {
	console.log("page open", status);
	page.evaluate(function () {
		init();
	});
});

function drawAgain(){
	page.evaluate(function () {
		//draw();
		//filterBlocks();
		animate();
	});	
}