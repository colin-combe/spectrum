var AnnotatedSpectrumModel = Backbone.Model.extend({
	defaults: {
		pepSeq1: "VGQQYSSAPLR",
		linkPos1: 3,
		pepSeq2: "EKELESIDVLLEQTTGGNNKDLK",
		linkPos2: 5,
		notUpperCase: /[^A-Z]/g,
	},

	initialize: function(){
		this.sticky = Array();
		this.highlights = Array();
		this.measureMode = false;
		this.on("change:JSONdata", function(){
			var json = this.get("JSONdata");
			if (typeof json !== 'undefined')
				this.setData(json);
			else
				this.trigger("cleared");
		});
	},
	setData: function(json){
		//var annotatedPeaksCSV = this.get("annotatedPeaksCSV");
		//this.set("annotatedPeaks", d3.csv.parse(annotatedPeaksCSV.trim()));
		this.sticky = Array();
		this.highlights = Array();
		this.JSONdata = json;
		//console.log(this.JSONdata);
		this.peptides = this.JSONdata.Peptides;
		this.pepStrs = [];
		for(i=0; i < this.peptides.length; i++){
			this.pepStrs[i] = "";
			for(j = 0; j < this.peptides[i].sequence.length; j++)
				this.pepStrs[i] += this.peptides[i].sequence[j].aminoAcid;
		}
		//maybe put id back in JSON? to make this obsolete
		this.fragments = [];
		for (var i = 0; i < this.JSONdata.fragments.length; i++) {
			this.fragments[i] = this.JSONdata.fragments[i];
			this.fragments[i].id = i;
		};
		this.notUpperCase = this.get("notUpperCase"); //change to global var
		this.cmap = colorbrewer.RdBu[8];
		this.p1color = this.cmap[0];
		this.p1color_cluster = this.cmap[2];
		this.p1color_loss = this.cmap[1];
		this.p2color = this.cmap[7];
		this.p2color_cluster = this.cmap[5];
		this.p2color_loss = this.cmap[6];
		this.lossFragBarColour = "#cccccc";
		this.highlightColour = "yellow";
		this.highlightWidth = 11;
		this.setGraphData();

	},

	clear: function(){
		this.JSONdata = null;
		this.sticky = Array();
		Backbone.Model.prototype.clear.call(this);
	},

	setGraphData: function(){

		var xmin = Number.POSITIVE_INFINITY;
		var xmax = Number.NEGATIVE_INFINITY;
		var tmp;
		var peaks = this.JSONdata.peaks;
		for (var i=peaks.length-1; i>=0; i--) {
		    tmp = peaks[i].mz;
		    if (tmp < xmin) xmin = tmp;
		    if (tmp > xmax) xmax = tmp;
		}

		this.xmaxPrimary = xmax + 50;
		this.xminPrimary = xmin - 50;

		this.xmax = this.xmaxPrimary;
		this.xmin = this.xminPrimary;

		var ymax = Number.NEGATIVE_INFINITY;
		var tmp;
		var peaks = this.JSONdata.peaks;
		for (var i=peaks.length-1; i>=0; i--) {
		    tmp = peaks[i].intensity;
		    if (tmp > ymax) ymax = tmp;
		}

		//this.ymaxPrimary = ymax / 0.9;
		this.ymaxPrimary = ymax;
		//this.ymax = d3.max(this.points, function(d){return d.y;});
		this.ymin = 0;//d3.min(this.points, function(d){return d.y;});
	},

	setZoom: function(domain){
		this.xmin = domain[0].toFixed(1);
		this.xmax = domain[1].toFixed(1);
		this.trigger("changed:Zoom");
	},

	addHighlight: function(fragments){
		for (f = 0; f < fragments.length; f++){
			if(this.highlights.indexOf(fragments[f]) == -1)
				this.highlights.push(fragments[f]);
		}
		this.trigger("changed:Highlights");
	},

	clearHighlight: function(fragments){
		for (f = 0; f < fragments.length; f++){
			var index = this.highlights.indexOf(fragments[f])
			if(index != -1 && !_.contains(this.sticky, fragments[f])){
				this.highlights.splice(index, 1);
			}
		}
		this.trigger("changed:Highlights");
	},

	clearStickyHighlights: function(){
		if(this.sticky.length != 0){
			var oldsticky = this.sticky;
			this.sticky = Array();
			this.clearHighlight(oldsticky);
		}
	},

	updateStickyHighlight: function(fragments, add){
		if (add === true){
			for(f = 0; f < fragments.length; f++){
				if (this.sticky.indexOf(fragments[f]) == -1)
					this.sticky.push(fragments[f]);
			}
		}
		else{
			if(this.sticky.length != 0){
				var oldsticky = this.sticky;
				this.sticky = Array();
				this.clearHighlight(oldsticky);
			}
			for(f = 0; f < fragments.length; f++)
				this.sticky.push(fragments[f]);
		}
	},

	changeColorScheme: function(scheme){
		switch(scheme) {
			case "RdBu": 
				this.cmap = colorbrewer.RdBu[8];
				break;
			case "BrBG": 
				this.cmap = colorbrewer.BrBG[8];
				break;
			case "PiYG": 
				this.cmap = colorbrewer.PiYG[8];
				break;
			case "PRGn": 
				this.cmap = colorbrewer.PRGn[8];
				break;
			case "PuOr": 
				this.cmap = colorbrewer.PuOr[8];
				break;			
		}
		this.p1color = this.cmap[0];
		this.p1color_cluster = this.cmap[2];
		this.p1color_loss = this.cmap[1];
		this.p2color = this.cmap[7];
		this.p2color_cluster = this.cmap[5];
		this.p2color_loss = this.cmap[6];
		this.trigger("changed:ColorScheme");
	}

});