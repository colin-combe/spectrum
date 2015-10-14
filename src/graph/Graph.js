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
//		author: Colin Combe
//
//		graph/Graph.js
//
//		see http://bl.ocks.org/stepheneb/1182434
//		and https://gist.github.com/mbostock/3019563

Graph = function(targetSvg, spectrumViewer, options) {
	this.x = d3.scale.linear();
	this.y = d3.scale.linear();
	this.highlightChanged = new signals.Signal();
	this.spectrumViewer = spectrumViewer;
	
	this.margin = {
		"top":    options.title  ? 140 : 120,
		"right":  30,
		"bottom": options.xlabel ? 60 : 40,
		"left":   options.ylabel ? 120 : 100
	};
	this.g =  targetSvg.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
	
	this.xaxis = this.g.append("g")
		.attr("class", "x axis");
	this.yaxis = this.g.append("g")
		.attr("class", "y axis");
	this.plot = this.g.append("rect")
		.style("fill", "white")
		.attr("pointer-events", "all");
	this.innerSVG = this.g.append("svg") //make this svg to clip plot at axes
		.attr("top", 0)
		.attr("left", 0)
		.attr("class", "line");
		
	this.highlights = this.innerSVG.append("g");
	this.peaks = this.innerSVG.append("g");
	this.lossiAnnotations = this.innerSVG.append("g");
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
		.style("text-anchor","middle");
	}
	// add y-axis label
	if (options.ylabel) {
	this.ylabel = this.g.append("g").append("text")
		.attr("class", "axis")
		.text(options.ylabel)
		.style("text-anchor","middle")
	}
};


Graph.prototype.setData = function(annotatedPeaks){
	this.clear();
 	this.xmaxPrimary = d3.max(annotatedPeaks,
			function(d){
				return ((d.isprimarymatch == 1)? d.expmz - 0 : 0);
			}
		) + 50;
	this.xminPrimary = d3.min(annotatedPeaks, function(d){return ((d.isprimarymatch == 1)?  d.expmz - 0 : this.xmaxPrimary);}) - 50;

	var nested =  d3.nest()
		.key(function(d) { return d.expmz +'-'+ d.absoluteintensity; })
		.entries(annotatedPeaks);
	this.points = new Array();
	for (var i = 0; i < nested.length; i++){
		this.points.push(new Peak(nested[i].values, this));
	}

	//~ this.xmax = d3.max(this.points, function(d){return d.x;}) + 10;
	//~ this.xmin = d3.min(this.points, function(d){return d.x;}) - 10;

	this.xmax = this.xmaxPrimary;
	this.xmin = this.xminPrimary;


	this.ymax = d3.max(this.points, function(d){return d.y;});
	this.ymin = 0;//d3.min(this.points, function(d){return d.y;});

	for (var i = 0; i < this.points.length; i++){
		this.points[i].init();
	}	

	this.resize();
}

Graph.prototype.resize = function() {
	var self = this;
	
	//see https://gist.github.com/mbostock/3019563
	var cx = self.g.node().parentNode.parentNode.clientWidth;
	var cy = self.g.node().parentNode.parentNode.clientHeight;
	
	self.g.attr("width", cx).attr("height", cy);
	var width = cx - self.margin.left - self.margin.right;
	var height = cy - self.margin.top  - self.margin.bottom;
	self.x.domain([self.xmin, self.xmax])
		.range([0, width]);
	// y-scale (inverted domain)
	self.y.domain([0, self.ymax]).nice()
		.range([height, 0]).nice();

	var yTicks = height / 40;
	var xTicks = width / 100;

	
	self.yaxis.call(d3.svg.axis().scale(self.y).ticks(yTicks).orient("left"));
	

	self.xAxis = d3.svg.axis().scale(self.x).ticks(xTicks).orient("bottom");
		
	self.xaxis.attr("transform", "translate(0," + height + ")")
		.call(self.xAxis);
	
	this.g.selectAll('.axis line, .axis path')
     .style({'stroke': 'Black', 'fill': 'none', 'stroke-width': '1.2px'});
		
	self.plot.attr("width", width)
		.attr("height", height)

	self.innerSVG.attr("width", width)
			.attr("height", height)
			.attr("viewBox", "0 0 "+width+" "+height);
				
	self.zoom = d3.behavior.zoom().x(self.x).on("zoom", self.redraw());
	self.plot.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
	self.innerSVG.call(self.zoom);

	if (this.title) {
		this.title.attr("x", width/2);
	}
	this.xlabel.attr("x", width/2).attr("y", height);
	this.ylabel.attr("transform","translate(" + -90 + " " + height/2+") rotate(-90)");
	
	self.redraw()();
}

Graph.prototype.redraw = function(){
	var self = this;
	return function (){
		for (var i = 0; i < self.points.length; i++){
		  self.points[i].update();
		}
		self.xaxis.call( self.xAxis);//d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		self.plot.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		self.innerSVG.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
	};
}

Graph.prototype.clear = function(){
	this.points= [];
	this.highlights.selectAll("*").remove();
	this.peaks.selectAll("*").remove();
	this.lossiAnnotations.selectAll("*").remove();
	this.annotations.selectAll("*").remove();
}


Graph.prototype.setHighlights = function(peptide, pepI){
	this.clearHighlights();
	if (peptide) {
		var peakCount = this.points.length;
		for (var p = 0; p < peakCount; p++) {
			var match = false;
			var peak = this.points[p];
			var fragCount = peak.fragments.length;
			for (var pf = 0; pf < fragCount; pf++) {
				var frag = peak.fragments[pf];
				var pepSeq = frag.peptide;
				if (peptide == frag.peptide
					&& ((frag.ionType == 'y' && frag.ionNumber == (pepSeq.length - pepI - 1))
						||(frag.ionType == 'b' && frag.ionNumber == (pepI - 0 + 1))
						)
					) {
					match = true;
				}
			}
			
			
			if (match === true) {
				this.points[p].highlight(true);
			}
		}	
	}
}

Graph.prototype.clearHighlights = function(peptide, pepI){
	var peakCount = this.points.length;
	for (var p = 0; p < peakCount; p++) {
		if (this.points[p].fragments.length > 0) {
			this.points[p].highlight(false);
		}
	}
}


/*
 * 

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
