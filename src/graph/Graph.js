//		a spectrum viewer
//
//      Copyright  2015 Rappsilber Laboratory, Edinburgh University
//
// 		Licensed under the Apache License, Version 2.0 (the "License");
// 		you may not use this file except in compliance with the License.
// 		You may obtain a copy of the License at
//
// 		http://www.apache.org/licenses/LICENSE-2.0
//
//   	Unless required by applicable law or agreed to in writing, software
//   	distributed under the License is distributed on an "AS IS" BASIS,
//   	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   	See the License for the specific language governing permissions and
//   	limitations under the License.
//
//		authors: Colin Combe, Lars Kolbowski
//
//		graph/Graph.js
//
//		see http://bl.ocks.org/stepheneb/1182434
//		and https://gist.github.com/mbostock/3019563

Graph = function(targetSvg, model, options) {
	this.x = d3.scale.linear();
	this.y = d3.scale.linear();
	this.y1 = d3.scale.linear();
	this.model = model;

	this.margin = {
		"top":    options.title  ? 130 : 110,
		"right":  options.ylabelRight ? 60 : 45,
		"bottom": options.xlabel ? 50 : 20,
		"left":   options.ylabelLeft ? 65 : 30
	};
	this.g =  targetSvg.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
	
	this.xaxisSVG = this.g.append("g")
		.attr("class", "x axis");
		//~ 
	/*
	 * -webkit-user-select: none;
			-khtml-user-select: none;
			-moz-user-select: -moz-none;
			-o-user-select: none;
			user-select: none;*/
	//brush
	this.brush = d3.svg.brush()
		.x(this.x)
		//~ .extent([15, 25])
		.on("brushstart", brushstart)
		.on("brush", brushmove)
		.on("brushend", brushend);
	this.xaxisRect = this.g.append("rect")
					.attr("height", "25")
					.attr("opacity", 0)
					.attr("pointer-events", "all")
					.style("cursor", "crosshair");
	this.xaxisRect.call(this.brush);	
	//~ this	
		
	this.yAxisLeftSVG = this.g.append("g")
		.attr("class", "y axis");
	this.yAxisRightSVG = this.g.append("g")
		.attr("class", "y axis");
	this.plot = this.g.append("rect")
		.style("fill", "white")
		.attr("pointer-events", "all");
	this.innerSVG = this.g.append("g")
		.attr("top", 0)
		.attr("left", 0)
		.attr("class", "line");
	this.dragZoomHighlight = this.innerSVG.append("rect").attr("y", 0).attr("fill","#addd8e");	
	
	this.plot.on("click", function(){
		this.model.clearStickyHighlights();
	}.bind(this));

	//MeasuringTool
	this.measuringTool = this.innerSVG.append("g")
	this.measuringToolVLineStart = this.measuringTool.append("line")
		.attr("stroke-width", 1)
		.attr("stroke", "Black");
	this.measuringToolVLineEnd = this.measuringTool.append("line")
		.attr("stroke-width", 1)
		.attr("stroke", "Black");
	this.measuringToolLine = this.measuringTool.append("line")
		.attr("y1", 50)
		.attr("y2", 50)
		.attr("stroke-width", 1)
		.attr("stroke", "Red");
	this.measureInfo =  d3.select("div#measureTooltip")
		.style("font-size", "0.8em");

	//------------------------------------


	this.highlights = this.innerSVG.append("g");
	this.peaks = this.innerSVG.append("g");
	this.lossyAnnotations = this.innerSVG.append("g");
	this.annotations = this.innerSVG.append("g");
	
	
	// add Chart Title
	if (options.title) {
		this.title = this.g.append("text")
		.attr("class", "axis")
		.text(options.title)
		.attr("dy","-0.8em")
		.style("text-anchor","middle");
	}
	// add the x-axis label
	if (options.xlabel) {
	this.xlabel = this.g.append("text")
		.attr("class", "aWWWAAAAAxis")
		.text(options.xlabel)
		.attr("dy","2.4em")
		.style("text-anchor","middle").style("pointer-events","none");
	}
	// add y-axis label
	if (options.ylabelLeft) {
	this.ylabelLeft = this.g.append("g").append("text")
		.attr("class", "axis")
		.text(options.ylabelLeft)
		.style("text-anchor","middle").style("pointer-events","none");
	}
	// add 2nd y-axis label
	if (options.ylabelRight) {
	this.ylabelRight = this.g.append("g").append("text")
		.attr("class", "axis")
		.text(options.ylabelRight)
		.style("text-anchor","middle").style("pointer-events","none");
	}
	

	var self = this;
	
	//~ brushstart();

	function brushstart() {
		//brushmove();
		self.dragZoomHighlight.attr("width",0);
		self.dragZoomHighlight.attr("display","inline");
	}

	function brushmove() {
	  var s = self.brush.extent();
	  var width = self.x(s[1] - s[0]) - self.x(0);
	  //console.log(s + "\t" + s[0] + "\t" + s[1] + "\t" + width);
	  //~ console.log(s[0]);
	  self.dragZoomHighlight.attr("x",self.x(s[0])).attr("width", width);
	}

	function brushend() {
	  self.dragZoomHighlight.attr("display","none");
	  var s = self.brush.extent();
	  self.x.domain(s);
	  self.brush.x(self.x);
	  self.resize(s[0], s[1], self.model.ymin, self.model.ymax);
	}
};


Graph.prototype.setData = function(){
	//create points array with Peaks
	this.points = new Array();
	this.pep1 = this.model.pep1;
	this.pep2 = this.model.pep2;
    if (this.model.JSONdata) {
        for (var i = 0; i < this.model.JSONdata.peaks.length; i++){
            this.points.push(new Peak(i, this));
        }
        this.model.points = this.points;
        //Isotope cluster
    /*	this.cluster = new Array();

        var peakCount = this.points.length;
        for (var p = 0; p < peakCount; p++) {
            var peak = this.points[p];
            if (peak.fragments.length > 0){
                this.cluster.push(new IsotopeCluster(p, this));
            }
        }*/
        //console.log(this.cluster);
        this.updatePeakColors();
    }

	this.resize(this.model.xminPrimary, this.model.xmaxPrimary, this.model.ymin, this.model.ymaxPrimary);
}

Graph.prototype.resize = function(xmin, xmax, ymin, ymax) {
	var self = this;
	//see https://gist.github.com/mbostock/3019563
	var cx = self.g.node().parentNode.parentNode.clientWidth;
	//somewhere around here I think we need to subtract the height of the FragKey?
	// ...the graph is not fitting entirely within its SVG element
	var fragKeyHeight = 100;//can tidy this up somehow 
	var cy = self.g.node().parentNode.parentNode.clientHeight;// - fragKeyHeight;
	
	self.g.attr("width", cx).attr("height", cy);
	var width = cx - self.margin.left - self.margin.right;
	var height = cy - self.margin.top  - self.margin.bottom;
	self.x.domain([xmin, xmax])
		.range([0, width]);
	// y-scale (inverted domain)
	self.y.domain([0, ymax*0.95]).nice()
		.range([height, 0]).nice();
	self.y1.domain([0, ymax]).nice()
		.range([height, 0]).nice();
	//y0 = d3.scale.linear().range([height, 0]);
	//self.y1 = d3.scale.linear().range([height, 0]);

	var yTicks = height / 40;
	var xTicks = width / 100;

	this.yTicks = yTicks;
	
	self.yAxisLeft = d3.svg.axis().scale(self.y).ticks(yTicks).orient("left").tickFormat(d3.format("s"));
	self.yAxisRight = d3.svg.axis().scale(self.y1).ticks(yTicks).orient("right").tickFormat(d3.format("s")); 

	self.yAxisLeftSVG.call(self.yAxisLeft);
	self.yAxisRightSVG.attr("transform", "translate(" + width + " ,0)");
	self.yAxisRightSVG.call(self.yAxisRight);
	

	self.xAxis = d3.svg.axis().scale(self.x).ticks(xTicks).orient("bottom");
		
	self.xaxisSVG.attr("transform", "translate(0," + height + ")")
		.call(self.xAxis);
	
	this.g.selectAll('.axis line, .axis path')
			.style({'stroke': 'Black', 'fill': 'none', 'stroke-width': '1.2px'});
	
	//~ this.g.selectAll('.tick')
		//~ .attr("pointer-events", "none");
		
	self.plot.attr("width", width)
		.attr("height", height)

	self.innerSVG.attr("width", width)
			.attr("height", height)
			.attr("viewBox", "0 0 "+width+" "+height);
	
	self.xaxisRect.attr("width",width).attr("y", height).attr("height", self.margin.bottom);
	self.dragZoomHighlight.attr("height", height);
				
	self.zoom = d3.behavior.zoom().x(self.x).on("zoom", self.redraw());
	self.plot.call(self.zoom);
	//self.innerSVG.call(self.zoom);

	if (this.title) {
		this.title.attr("x", width/2);
	}
	this.xlabel.attr("x", width/2).attr("y", height);
	this.ylabelLeft.attr("transform","translate(" + -50 + " " + height/2+") rotate(-90)");
	var test = width+45;
	this.ylabelRight.attr("transform","translate(" + test + " " + height/2+") rotate(-90)");

	
	self.redraw()();
}

Graph.prototype.disablePanning = function(){
		this.plot.call(this.zoom)
			.on("mousedown.zoom", null)
			.on("touchstart.zoom", null)
			.on("touchmove.zoom", null)
			.on("touchend.zoom", null);
}

Graph.prototype.measure = function(on){
	if (on === true){
		this.disablePanning();
		var self = this;

		function measureStart() {
			self.measuringTool.attr("display","inline");
			//self.measureInfo.style("display", "inline");
			var coords = d3.mouse(this);
			var mouseX = self.x.invert(coords[0]);
			var distance = 100;
			var highlighttrigger = 10;
			var peakCount = self.points.length;
			for (var p = 0; p < peakCount; p++) {
				var peak = self.points[p];
				if (_.intersection(self.model.highlights, peak.fragments).length != 0 && Math.abs(peak.x - mouseX)  < highlighttrigger){
					self.measureStartPeak = peak;
					break;
				}

				if (Math.abs(peak.x - mouseX)  < distance){
					distance = Math.abs(peak.x - mouseX);
					self.measureStartPeak = peak;
				}
			}
			self.measuringToolVLineStart
				.attr("x1", self.x(self.measureStartPeak.x))
				.attr("x2", self.x(self.measureStartPeak.x))
				.attr("y1", self.y(self.measureStartPeak.y))
				.attr("y2", 0);
			self.measuringToolLine
				.attr("x1", self.x(self.measureStartPeak.x))
				.attr("x2", coords[0])
				.attr("y1", coords[1])
				.attr("y2", coords[1]);
			self.measuringToolVLineEnd
				.attr("x1", coords[0])
				.attr("x2", coords[0])
				.attr("y1", self.y(0))
				.attr("y2", 0);
			//self.measuringToolLine.attr("display","inline");
		}

		function measureMove() {
			var coords = d3.mouse(this);
			var mouseX = self.x.invert(coords[0]);
			//find start and endPeak
			var distance = 2;
			var highlighttrigger = 10;	//triggerdistance to prioritize highlighted peaks as endpoint
			var triggerdistance = 5;	//triggerdistance to use peak as endpoint
			var peakCount = self.points.length;
			for (var p = 0; p < peakCount; p++) {
				var peak = self.points[p];
				if (_.intersection(self.model.highlights, peak.fragments).length != 0 && Math.abs(peak.x - mouseX)  < highlighttrigger){
					var endPeak = peak;
					break;
				}
				if (mouseX - triggerdistance < peak.x < mouseX + triggerdistance && Math.abs(peak.x - mouseX)  < distance){
					var endPeak = peak
					distance = Math.abs(peak.x - mouseX);
				}
			}
			
			//draw vertical end Line
			if(endPeak){
				self.measuringToolVLineEnd
					.attr("x1", self.x(endPeak.x))
					.attr("x2", self.x(endPeak.x))
					.attr("y1", self.y(endPeak.y))
					.attr("y2", 0);
			}
			else{
				self.measuringToolVLineEnd
					.attr("x1", coords[0])
					.attr("x2", coords[0])
					.attr("y1", self.y(0))
					.attr("y2", 0);
			}

			//draw horizontal line
			var measureStartX = parseFloat(self.measuringToolVLineStart.attr("x1"));
			var measureEndX = parseFloat(self.measuringToolVLineEnd.attr("x1"));
			if (coords[1] < 0)
				var y = 0;
			else if (coords[1] > self.y(0))
				var y  = self.y(0);
			else
				var y = coords[1];


			self.measuringToolLine
				.attr("x2", measureEndX)
				.attr("y1", y)
				.attr("y2", y);

			//draw peak info
			var deltaX = Math.abs(measureStartX - measureEndX);
			var distance = Math.abs(self.x.invert(measureStartX) - self.x.invert(measureEndX));
			if (measureStartX  < measureEndX)
				var labelX = measureStartX  + deltaX/2;
			else
				var labelX = measureEndX + deltaX/2;	
			var PeakInfo = distance.toFixed(2)+" Th<br/>"

			if(self.measureStartPeak.fragments.length > 0){
				if (self.measureStartPeak.isMonoisotopic)
					PeakInfo += "From: <span style='color:"+ self.measureStartPeak.colour +"'>" + self.measureStartPeak.fragments[0].name +"</span> (" + self.measureStartPeak.x + " m/z)";
				else
					PeakInfo += "From: <span style='color:"+ self.measureStartPeak.colour +"'>" + self.measureStartPeak.fragments[0].name +"</span>+"+self.measureStartPeak.isotope+ " (" + self.measureStartPeak.x + " m/z)";
			}
			else
				PeakInfo += "From: Peak (" + self.measureStartPeak.x + " m/z)"; 
			if(endPeak){
				if(endPeak.fragments.length > 0){
					if (endPeak.isMonoisotopic)
						PeakInfo += "<br/>To: <span style='color:"+ endPeak.colour +"'>" + endPeak.fragments[0].name +"</span> (" + endPeak.x + " m/z)";
					else{
						PeakInfo += "<br/>To: <span style='color:"+ endPeak.colour +"'>" + endPeak.fragments[0].name +"</span>+"+endPeak.isotope+ " (" + endPeak.x + " m/z)";
					}
				}
				else{
					PeakInfo += "<br/>To: Peak (" + endPeak.x + " m/z)";
					} 
			} else {
                PeakInfo += "<br/>";
            }
			PeakInfo += "<br/><br/><p style='font-size:0.8em'>";
			for(i=1; i<7; i++){
			PeakInfo += "z = "+i+": "+(distance/i).toFixed(2)+" Da</br>";	
			}
			PeakInfo += "</p>";
			


			var matrix = this.getScreenCTM()
                .translate(+this.getAttribute("cx"),
                         +this.getAttribute("cy"));

/*			if ($("#measureTooltip").width() > Math.abs(measureStartX - measureEndX))
				var positionX = coords[0] + $("#measureTooltip").width()/2 + "px";
            else*/
            	if (measureStartX < measureEndX)
            		var positionX = coords[0] - Math.abs(measureStartX - measureEndX)/2 - 10;
            	else
            		var positionX = coords[0] + Math.abs(measureStartX - measureEndX)/2 - 10;


            // Because chrome is deprecating offset on svg elements
            function getSVGOffset (svg) {
                var pnode = svg;
                var pBCR;
                while (pnode && !pBCR) {
                    var posType = (pnode == document) ? "static" : d3.select(pnode).style("position");
                    if (posType !== "" && posType !== "static" && posType !== "inherit") {
                        pBCR = pnode.getBoundingClientRect();
                    }
                    pnode = pnode.parentNode;
                }
                var svgBCR = svg.getBoundingClientRect();
                pBCR = pBCR || {top: 0, left: 0};
                return {top: svgBCR.top - pBCR.top, left: svgBCR.left - pBCR.left};
            }
            
            
            var svgNode = self.g.node().parentNode;
            var rectBounds = this.getBoundingClientRect();
            var svgBounds = svgNode.getBoundingClientRect();
            var rectOffX = 0; //rectBounds.left - svgBounds.left;
            var rectOffY = rectBounds.top - svgBounds.top;
            var svgOffset = getSVGOffset (svgNode);
            //console.log ("svg offset", svgOffset);
            rectOffX += svgOffset.left; // add on offsets to svg's relative parent
            rectOffY += svgOffset.top;
            rectOffX += positionX;
            rectOffY += y - 16; // the offset of the drag in the rect
            
			self.measureInfo
				.style("display", "inline")
				.html(PeakInfo)
            	.style("left", 
                    rectOffX +"px"
                    //positionX +"px"
                )
            	.style("top",
                       rectOffY + "px"
                   //(window.pageYOffset + matrix.f + y -16) + "px"
                );		  
		}
        
        

		this.measureBrush = d3.svg.brush()
			.x(this.x)
			.on("brushstart", measureStart)
			.on("brush", measureMove)

		this.plot.call(this.measureBrush);
		//this.innerSVG.call(this.measureBrush);


	}
	else{
		this.measureClear();
		this.plot.call(this.zoom);
		//this.innerSVG.call(this.zoom);
		this.measureBrush = d3.svg.brush()
			.on("brushstart", null)
			.on("brush", null)
			.on("brushend", null);
		this.plot.call(this.measureBrush);
/*		this.plot.on("click", function(){
			this.model.clearStickyHighlights();
		}.bind(this));*/
		//this.innerSVG.call(this.measureBrush);
	}
}

Graph.prototype.measureClear = function(){
		this.measuringTool.attr("display","none");
		this.measureInfo.style("display","none");	
}

Graph.prototype.redraw = function(){
	var self = this;
	//self.measure();
	return function (){

		//get highest intensity from peaks in x range
		//adjust y scale to new highest intensity


		self.measureClear();
		if (self.points) {
			var ymax = 0
			var xDomain = self.x.domain();
			for (var i = 0; i < self.points.length; i++){
			  if (self.points[i].y > ymax && (self.points[i].x > xDomain[0] && self.points[i].x < xDomain[1]))
			  	ymax = self.points[i].y;
			}
			//console.log(ymax);
			//self.y.domain([0, ymax/0.9]).nice();
			self.y.domain([0, ymax/0.95]).nice();
			self.y1.domain([0, (ymax/(self.model.ymaxPrimary*0.95))*100]).nice();
			self.yAxisLeftSVG.call(self.yAxisLeft);
			self.yAxisRightSVG.call(self.yAxisRight);
			for (var i = 0; i < self.points.length; i++){
				self.points[i].update();
			}			
		}
		self.xaxisSVG.call( self.xAxis);
		if (self.model.measureMode)
			self.disablePanning();
		//d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		//self.plot.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		//self.innerSVG.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		self.model.setZoom(self.x.domain());
	};
}

Graph.prototype.clear = function(){
	this.points= [];
	this.highlights.selectAll("*").remove();
	this.peaks.selectAll("*").remove();
	this.lossyAnnotations.selectAll("*").remove();
	this.annotations.selectAll("*").remove();
}


Graph.prototype.clearHighlights = function(peptide, pepI){
	var peakCount = this.points.length;
	for (var p = 0; p < peakCount; p++) {
		if (this.points[p].fragments.length > 0 && !_.contains(this.model.sticky, this.points[p].fragments[0])) {
			this.points[p].highlight(false);
		}
	}
}

Graph.prototype.updatePeakColors = function(){
	var peakCount = this.points.length;

	if (this.model.highlights.length == 0){
		for (var p = 0; p < peakCount; p++) {
			this.points[p].line.attr("stroke", this.points[p].colour);
		}
	}
	else{
		for (var p = 0; p < peakCount; p++) {
			if (_.intersection(this.model.highlights, this.points[p].fragments).length == 0)
				this.points[p].line.attr("stroke", this.model.lossFragBarColour);
			else
				this.points[p].line.attr("stroke", this.points[p].colour);
		}
	}
}

Graph.prototype.updatePeakLabels = function(){
	var peakCount = this.points.length;

	if (this.model.highlights.length == 0){
		for (var p = 0; p < peakCount; p++) {
			if (this.points[p].fragments.length > 0) {
				this.points[p].removeLabels();
				this.points[p].showLabels();
			}
		}
	}
	else{
		for (var p = 0; p < peakCount; p++) {
			if (_.intersection(this.model.highlights, this.points[p].fragments).length == 0)
				this.points[p].removeLabels();
			else{
				this.points[p].removeLabels();
				this.points[p].showLabels(true);
			}
		}
	}
}

Graph.prototype.updateColors = function(){
	var peakCount = this.points.length;
		for (var p = 0; p < peakCount; p++) {
			this.points[p].updateColor();
		}
}
/*

Graph.prototype.resetScales = function(text) {
	  this.y = d3.scale.linear()
	  .domain([this.options.ymax, this.options.ymin])
	  .nice()
	  .range([0, this.size.height])
	  .nice();

	this.zoom.scale(1, 1);
	this.zoom.translate([0, 0]);
	this.redraw()();
};
*/
