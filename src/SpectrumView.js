var SpectrumView = Backbone.View.extend({

	el: "#spectrumDiv",

	initialize: function() {
		//colors
		this.lossFragBarColour = "#cccccc";

		this.svg = d3.select(this.el).append("svg").style("width", "100%").style("height", "100%");
		
		this.x = d3.scale.linear();
		this.y = d3.scale.linear();

		this.xlabel = "m/z";
		this.ylabel = "Intensity";

		this.margin = {
			"top":    this.title  ? 130 : 110,
			"right":  10,
			"bottom": this.xlabel ? 50 : 20,
			"left":   this.ylabel ? 60 : 30
		};

		this.g =  this.svg.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
		this.xaxis = this.g.append("g").attr("class", "x axis");
		this.brush = d3.svg.brush()
		.x(this.x)
		//~ .extent([15, 25])
		.on("brushstart", this.brushstart)
		.on("brush", this.brushmove)
		.on("brushend", this.brushend);
		this.xaxisRect = this.g.append("rect")
		.attr("height", "25")
		.attr("opacity", 0)
		.attr("pointer-events", "all")
		.style("cursor", "crosshair");
		this.xaxisRect.call(this.brush);	
	//~ this	

	this.yaxis = this.g.append("g")
	.attr("class", "y axis");
	this.plot = this.g.append("rect")
	.style("fill", "white")
	.attr("pointer-events", "all");
	this.innerSVG = this.g.append("g")
	//.attr("top", 0)
	//.attr("left", 0) // MG - g elements shouldnt have these attributes
	.attr("class", "line");
	
	this.dragZoomHighlight = this.innerSVG.append("rect").attr("y", 0).attr("fill","#addd8e");	
	
	
	this.highlights = this.innerSVG.append("g");
	this.peaks = this.innerSVG.append("g");
	this.lossyAnnotations = this.innerSVG.append("g");
	this.annotations = this.innerSVG.append("g");
	
	
	// add Chart Title
	if (this.title) {
		this.title = this.g.append("text")
		.attr("class", "axis")
		.text(this.title)
		.attr("dy","-0.8em")
		.style("text-anchor","middle");
	}
	// add the x-axis label
	if (this.xlabel) {
		this.xlabel = this.g.append("text")
		.attr("class", "aWWWAAAAAxis")
		.text(this.xlabel)
		.attr("dy","2.4em")
		.style("text-anchor","middle").style("pointer-events","none");
	}
	// add y-axis label
	if (this.ylabel) {
		this.ylabel = this.g.append("g").append("text")
		.attr("class", "axis")
		.text(this.ylabel)
		.style("text-anchor","middle").style("pointer-events","none");
	}
	
	//?
	var self = this;


		//
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, 'destroy', this.remove);
	},

	render: function() {
		console.log(this.model.annotatedPeaks);
		this.setPoints();
		this.resize();

/*		this.$el.html(this.template(this.model.toJSON()));
		this.$el.toggleClass('done', this.model.get('done'));
		this.input = this.$('.edit');
		return this;*/
	},

	setPoints: function(){
		//create points array with Peaks
		this.points = new Array();
		for (var i = 0; i < this.model.nested.length; i++){
			this.points.push(new Peak(this.model.nested[i].values, this));
		}
	},

	brushstart: function() {
		//brushmove();
		self.dragZoomHighlight.attr("width",0);
		self.dragZoomHighlight.attr("display","inline");
	},

	brushmove: function() {
		var s = self.brush.extent();
		var width = self.x(s[1] - s[0]) - self.x(0);
	  //console.log(s + "\t" + s[0] + "\t" + s[1] + "\t" + width);
	  //~ console.log(s[0]);
	  self.dragZoomHighlight.attr("x",self.x(s[0])).attr("width", width);
	},

	brushend: function() {
		self.dragZoomHighlight.attr("display","none");
		var s = self.brush.extent();
		self.x.domain(s);
		self.brush.x(self.x)
		self.redraw()();
	},

	resize : function(){
		var self = this;

		//see https://gist.github.com/mbostock/3019563
		var cx = self.g.node().parentNode.parentNode.clientWidth;
		var cy = self.g.node().parentNode.parentNode.clientHeight;
		
		//self.g.attr("width", cx).attr("height", cy);    // MG - g's shouldn't have width/height
		var width = cx - self.margin.left - self.margin.right;
		var height = cy - self.margin.top  - self.margin.bottom;
		self.x.domain([this.model.xmin, this.model.xmax])
		.range([0, width]);
		// y-scale (inverted domain)
		self.y.domain([0, this.model.ymax]).nice()
		.range([height, 0]).nice();

		var yTicks = height / 40;
		var xTicks = width / 100;

		
		self.yaxis.call(d3.svg.axis().scale(self.y).ticks(yTicks)
			.orient("left").tickFormat(d3.format("s")));
		

		self.xAxis = d3.svg.axis().scale(self.x).ticks(xTicks).orient("bottom");

		self.xaxis.attr("transform", "translate(0," + height + ")")
		.call(self.xAxis);
		
		this.g.selectAll('.axis line, .axis path')
		.style({'stroke': 'Black', 'fill': 'none', 'stroke-width': '1.2px'});
		
		//~ this.g.selectAll('.tick')
			//~ .attr("pointer-events", "none");
			
			self.plot.attr("width", width)
			.attr("height", height)

			//self.innerSVG.attr("width", width)
			//.attr("height", height)
			//.attr("viewBox", "0 0 "+width+" "+height); // MG - innerSVG is g, shouldn't have these attributes

			self.xaxisRect.attr("width",width).attr("y", height).attr("height", self.margin.bottom);
			self.dragZoomHighlight.attr("height", height);

			self.zoom = d3.behavior.zoom().x(self.x).on("zoom", self.redraw());
			self.plot.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
			self.innerSVG.call(self.zoom);

			if (this.title) {
				this.title.attr("x", width/2);
			}
			this.xlabel.attr("x", width/2).attr("y", height);
			this.ylabel.attr("transform","translate(" + -45 + " " + height/2+") rotate(-90)");

			self.redraw()();
		},

		redraw : function(){
			var self = this;
			return function (){
				for (var i = 0; i < self.points.length; i++){
					self.points[i].update();
				}
			self.xaxis.call( self.xAxis);//d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
			self.plot.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
			self.innerSVG.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
			};
		},

		greyPeaks : function(){
			var peakCount = this.points.length;
			for (var p = 0; p < peakCount; p++) {
				this.points[p].line.attr("stroke", SpectrumViewer.lossFragBarColour);
			}
		},

/*Peak: function(data,graph){

	this.x = data[0].expmz - 0;
	this.y = data[0].absolute_intensity - 0;

		//make fragments
		var notLossyFragments = [];
		var lossyFragments = [];
		var fragCount = data.length;
		for (var f = 0; f < fragCount; f++) {
			//check if the Peak is a fragment or not and if create a new Fragment
			if (data[f].fragment_name.trim() != "") {
				var frag = new graph.Fragment(data[f]);
				if (frag.lossy === false) {
					notLossyFragments.push(frag);
				} else {
					lossyFragments.push(frag);
				}
			}
		}
		this.fragments = notLossyFragments.concat(lossyFragments); //merge arrays

	//make tooltip
	var tooltip = "";
	var fragCount = this.fragments.length;
	for (var f = 0; f < fragCount; f++){
		if (f > 0) {
			tooltip += ", ";
		}
		tooltip += this.fragments[f].sequence;
	}
	this.tooltip = tooltip + " m/z: " + this.x + ", i: " + this.y

	//svg elements
	this.g = graph.peaks.append('g');
	this.g.append("svg:title").text(this.tooltip);	// easy tooltip
	if (this.fragments.length > 0) {
		this.highlightLine = this.g.append('line')
		.attr("stroke", SpectrumViewer.highlightColour)
		.attr("stroke-width", SpectrumViewer.highlightWidth)
		.attr("opacity","0");
		//this.highlightLine.append("svg:title").text(this.tooltip);	// easy tooltip
		this.highlightLine.attr("x1", 0);
		this.highlightLine.attr("x2", 0);
	}

	},

	Peak.prototype.update = function(){
	this.updateX();
	this.updateY();
	}

	Fragment: function(data){
		this.name = data.fragment_name.trim();

		this.peptide = data.matchedpeptide.replace(SpectrumViewer.notUpperCase, '');

		this.sequence = data.sequence;

		var ion = this.name.split('')[0];
		if (ion == 'a' || ion == 'b' || ion == 'c') {
			this.ionType = 'b';
		} else {
			this.ionType = 'y';
		}

		var fragRegex = /(.(\d*))/g;
		var regexMatch = fragRegex.exec(this.name);
		this.ionNumber = regexMatch[2] - 0;

		this.lossy = false;
		if (this.name.indexOf("_") != -1){
			this.lossy =true;
		}
	}*/
});