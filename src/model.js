var AnnotatedSpectrumModel = Backbone.Model.extend({

	initialize: function(){
		this.getKnownModifications();
		//this.sticky = Array();
		//this.highlights = Array();
		this.measureMode = false;
		this.on("change:JSONdata", function(){
			var json = this.get("JSONdata");
			if (typeof json !== 'undefined')
				this.setData();
			else
				this.trigger("cleared");
		});
		this.on("change:clModMass", function(){
			if(this.peptides !== undefined && this.knownModifications !== undefined)
				this.calcPrecursorMass();
		});

		//really necessary?
		this.on("change:charge", function(){
			this.charge = parseInt(this.get("charge"));
			this.trigger("changed:charge");
		});	

		this.on("change:modifications", function(){
			this.updateKnownModifications();
			if(this.peptides !== undefined)
				this.calcPrecursorMass();
		});

	},

	setData: function(){
		$("#measuringTool").prop("checked", false);
		$("#moveLabels").prop("checked", false);			
		this.sticky = Array();
		this.highlights = Array();
//~ <<<<<<< HEAD
		this.JSONdata = this.get("JSONdata");
		this.match = this.get("match");
		this.randId = this.get("randId");
		//console.log(this.JSONdata);
//~ =======
		//~ this.JSONdata = json;
		//~ //console.log(this.JSONdata);
		//~ this.peptides = this.JSONdata.Peptides;
//~ >>>>>>> 0cc3f394d29c8480b9a4aab10b25d0cb9dccd2f1
		this.pepStrs = [];
		this.pepStrsMods = [];
		this.peptides = this.JSONdata.Peptides;
		for(i=0; i < this.peptides.length; i++){
			this.pepStrs[i] = "";
			this.pepStrsMods[i] = "";
			for(j = 0; j < this.peptides[i].sequence.length; j++){
				this.pepStrs[i] += this.peptides[i].sequence[j].aminoAcid;
				this.pepStrsMods[i] += this.peptides[i].sequence[j].aminoAcid + this.peptides[i].sequence[j].Modification;
			}
		}
		if (this.JSONdata.fragments !== undefined){
			this.fragments = [];
			for (var i = 0; i < this.JSONdata.fragments.length; i++) {
				this.fragments[i] = this.JSONdata.fragments[i];
				this.fragments[i].id = i;
			};
		};
		this.notUpperCase = "/[^A-Z]/g"; //change to global var
		this.cmap = colorbrewer.RdBu[8];
		this.p1color = this.cmap[0];
		this.p1color_cluster = this.cmap[2];
		this.p1color_loss = this.cmap[1];
		this.p2color = this.cmap[7];
		this.p2color_cluster = this.cmap[5];
		this.p2color_loss = this.cmap[6];
		this.lossFragBarColour = "#cccccc";
		this.highlightColour = "yellow";
		this.highlightWidth = 10;


		this.calcPrecursorMass();
		if (window.modTable !== undefined)
			modTable.ajax.url( "forms/convertMods.php?peps="+encodeURIComponent(this.pepStrsMods.join(";"))).load();
		this.trigger("changed:data");
		
		if (this.JSONdata.peaks !== undefined)
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
	},


	changeLinkPos: function(newLinkSites){

		if (this.match !== undefined){
			var newmatch = $.extend(true, {}, this.match);	//clone object so linkpos change is not cached
			newmatch.linkPos1 = newLinkSites[0];
			newmatch.linkPos2 = newLinkSites[1];
			//set the original linkPos if its not set yet
			if (this.match.oldLinkPos === undefined)
				newmatch.oldLinkPos = [this.match.linkPos1, this.match.linkPos2];
			//if the newlinkpos are the original ones delete oldLinkPos
			else if (this.match.oldLinkPos[0] == newLinkSites[0] && this.match.oldLinkPos[1] == newLinkSites[1])
				newmatch.oldLinkPos = undefined;
			CLMSUI.loadSpectra(newmatch, this.randId, this);			
		}
		else{
			for (var i = 0; i < newLinkSites.length; i++) {
				if (this.JSONdata.LinkSite[i] === undefined){
					this.JSONdata.LinkSite[i] = {id: 0, linkSite: newLinkSites[i], peptideId: i}		
				}
				else
					this.JSONdata.LinkSite[i].linkSite = newLinkSites[i];
			}
			this.setData();	
		}	

	},


	changeMod: function(oldPos, newPos, pepIndex){

		this.JSONdata.Peptides[pepIndex].sequence[newPos].Modification = this.JSONdata.Peptides[pepIndex].sequence[oldPos].Modification;
		this.JSONdata.Peptides[pepIndex].sequence[oldPos].Modification = "";

		//this.setData();			
		var pepSeq = ""
		for (var i = 0; i < this.JSONdata.Peptides[pepIndex].sequence.length; i++) {
			pepSeq += this.JSONdata.Peptides[pepIndex].sequence[i].aminoAcid;
			pepSeq += this.JSONdata.Peptides[pepIndex].sequence[i].Modification;
		}

		var newmatch = $.extend(true, {}, this.match);	//clone object
		if (pepIndex == 0)
			newmatch.pepSeq1raw = pepSeq;
		if (pepIndex == 1)
			newmatch.pepSeq2raw = pepSeq;
		CLMSUI.loadSpectra(newmatch, this.randId, this);
	},

	checkForValidModification: function(mod, aminoAcid){
		for (var i = 0; i < this.knownModifications['modifications'].length; i++) {
			if(this.knownModifications['modifications'][i].id == mod){
				if ($.inArray(aminoAcid, this.knownModifications['modifications'][i].aminoAcids) != -1)
					return true;
				else
					return false;
			}
		}
	},

	calcPrecursorMass: function(){
		//if(this.knownModifications === undefined)
		//	this.getKnownModifications();
		var aastr = "ARNDCEQGHILKMFPSTWYV";
		var mA = new Array();
		mA[aastr.indexOf("A")] = 71.0788;
		mA[aastr.indexOf("R")] = 156.1876;
		mA[aastr.indexOf("N")] = 114.1039;
		mA[aastr.indexOf("D")] = 115.0886;
		mA[aastr.indexOf("C")] = 103.1448;
		mA[aastr.indexOf("E")] = 129.1155;
		mA[aastr.indexOf("Q")] = 128.1308;
		mA[aastr.indexOf("G")] = 57.0520;
		mA[aastr.indexOf("H")] = 137.1412;
		mA[aastr.indexOf("I")] = 113.1595;
		mA[aastr.indexOf("L")] = 113.1595;
		mA[aastr.indexOf("K")] = 128.1742;
		mA[aastr.indexOf("M")] = 131.1986;
		mA[aastr.indexOf("F")] = 147.1766;
		mA[aastr.indexOf("P")] = 97.1167;
		mA[aastr.indexOf("S")] = 87.0782;
		mA[aastr.indexOf("T")] = 101.1051;
		mA[aastr.indexOf("W")] = 186.2133;
		mA[aastr.indexOf("Y")] = 163.1760;
		mA[aastr.indexOf("V")] = 99.1326;

		var massArr = new Array();		
		var h2o = 18.01528;

		for (var i = 0; i < this.peptides.length; i++) {
			// if (this.modifications === undefined){
			// 	this.modifications = new Object();
			// 	this.modifications.data = this.JSONdata.annotation.modifications;
			// }
			massArr[i] = h2o;
			for (var j = 0; j < this.peptides[i].sequence.length; j++) {
				var AA = this.peptides[i].sequence[j].aminoAcid;
				massArr[i] += mA[aastr.indexOf(AA.charAt(i))];	
				//mod
				var mod = this.peptides[i].sequence[j].Modification;
				for (var k = 0; k < this.knownModifications['modifications'].length; k++) {
					if (this.knownModifications['modifications'][k].id == mod)
						massArr[i] += this.knownModifications['modifications'][k].mass;
				}		
			}
		}

		var totalMass = 0;
		if(this.get("clModMass") !== undefined){
			for (var i = 0; i < massArr.length; i++) {
				totalMass += massArr[i];
			}
			totalMass += parseInt(this.get("clModMass"));
			this.mass = [totalMass];
		}
		else{
			this.mass = massArr;
		}
		console.log(this.mass);
		this.trigger("changed:mass");
	},

	getKnownModifications: function(){
		var self = this;
		var response = $.ajax({
			type: "GET",
			datatype: "json",
			async: false,
			url: "../spectrum/php/getKnownMods.php",
			success: function(data) {
				self.knownModifications = JSON.parse(JSON.parse(data));
			}
		});	
	},

	updateKnownModifications: function(){
		customMods = this.get("modifications").data;
		for (var i = 0; i < customMods.length; i++) {
			for (var j = 0; j < this.knownModifications['modifications'].length; j++) {
				if(this.knownModifications['modifications'][j].id == customMods[i].id){
					this.knownModifications['modifications'][j].mass = customMods[i].mass;
					this.knownModifications['modifications'][j].aminoAcids = customMods[i].aminoAcids;
				}
			}				
		}	

	
	}
});
