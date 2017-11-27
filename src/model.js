var AnnotatedSpectrumModel = Backbone.Model.extend({

	defaults: function() {
    return {
      baseDir:  '',
			xiAnnotatorBaseURL: 'http://xi3.bio.ed.ac.uk/xiAnnotator/',
      JSONdata: false,
    };
  },

	initialize: function(){
		var self = this;
		this.xiAnnotatorBaseURL = this.get('xiAnnotatorBaseURL');
		this.baseDir = this.get('baseDir');
		this.getKnownModifications();

		this.showDecimals = 2;
		this.moveLabels = false;
		this.measureMode = false;
		this.showSpectrum = true;
		if (_.isUndefined(Cookies.get('customMods')))
			this.userModifications = [];
		else
			this.userModifications = JSON.parse(Cookies.get('customMods'));
		$.getJSON(self.baseDir + 'json/aaMasses.json', function(data) {
    		self.aaMasses = data
		});

		//ToDo: change JSONdata gets called 3 times for some reason?
		this.on("change:JSONdata", function(){
			var json = this.get("JSONdata");
			if (typeof json !== 'undefined'){
				this.setData();
			}
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

/*		this.on("change:modifications", function(){
			this.updateKnownModifications();
			if(this.peptides !== undefined)
				this.calcPrecursorMass();
		});*/

	},

	setData: function(){

		if (this.get("JSONdata") == null){
			this.trigger("changed:data");
			return
		}

		$("#measuringTool").prop("checked", false);
		$("#moveLabels").prop("checked", false);
		this.sticky = Array();
		this.highlights = Array();
		this.JSONdata = this.get("JSONdata");
		this.match = this.get("match");
		this.randId = this.get("randId");
		//console.log(this.JSONdata);
		this.annotationData = this.JSONdata.annotation;

		//overwrite xiKnownModifications with data from input
		this.updateKnownModifications();

		if (this.annotationData !== undefined){
			this.MSnTolerance = {
				"value": parseFloat(this.annotationData.fragementTolerance.split(" ")[0]),
				"unit": this.annotationData.fragementTolerance.split(" ")[1]
			};
		}

		this.pepStrs = [];
		this.pepStrsMods = [];
		this.peptides = this.JSONdata.Peptides;
		if(this.peptides.length == 1)
			this.isLinear = true;
		else
			this.isLinear = false;
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
		this.peakColour = "#ccc";
		this.highlightColour = "#FFFF00";
		this.highlightWidth = 10;

		this.calcPrecursorMass();

		if (this.JSONdata.peaks !== undefined)
			this.setGraphData();

	},

	peaksToMGF: function(){
		var output = "";
		for (var i = 0; i < this.JSONdata.peaks.length; i++) {
			output += this.JSONdata.peaks[i].mz + "	";
			output += this.JSONdata.peaks[i].intensity + "\n";
		}
		return output;
	},

	clear: function(){
		this.JSONdata = null;
		this.set("JSONdata", null);
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

		var ymax = Number.NEGATIVE_INFINITY;
		var tmp;
		var peaks = this.JSONdata.peaks;
		for (var i=peaks.length-1; i>=0; i--) {
		    tmp = peaks[i].intensity;
		    if (tmp > ymax) ymax = tmp;
		}

		//this.ymaxPrimary = ymax / 0.9;
		this.ymaxPrimary = ymax;

		if (!this.lockZoom){
			this.xmax = this.xmaxPrimary;
			this.xmin = this.xminPrimary;
			this.ymax = this.ymaxPrimary;
			this.ymin = 0;
		}

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

	changeHighlightColor: function(color){
		this.highlightColour = color;
		this.trigger("changed:HighlightColor");
	},

	changeLinkPos: function(newLinkSites){

		if(this.get("JSONrequest") !== undefined){
			json_req = this.get("JSONrequest");
			for (var i = 0; i < newLinkSites.length; i++) {
				json_req.LinkSite[i].linkSite = newLinkSites[i]-1;
			}
			this.request_annotation(json_req);
		}
		else if (this.match !== undefined){
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


	changeMod: function(oldPos, newPos, oldPepIndex, newPepIndex){

		if(this.get("JSONrequest") !== undefined){
			json_req = this.get("JSONrequest");
			//standalone
			var myNew = json_req.Peptides[newPepIndex].sequence[newPos];
			var myOld = this.JSONdata.Peptides[oldPepIndex].sequence[oldPos];

			myNew.Modification = myOld.Modification;
			json_req.Peptides[oldPepIndex].sequence[oldPos].Modification = "";

			if (myNew.aminoAcid != myOld.aminoAcid){
				var annotationMod = $.grep(json_req.annotation.modifications, function(e){ return e.id == myNew.Modification; });
				if (annotationMod[0].aminoAcids.indexOf(myNew.aminoAcid) === -1)
					annotationMod[0].aminoAcids.push(myNew.aminoAcid);
			}
			this.request_annotation(json_req);
		}
		else if (this.match !== undefined){
			//CLMSUI integrated
			this.JSONdata.Peptides[newPepIndex].sequence[newPos].Modification = this.JSONdata.Peptides[oldPepIndex].sequence[oldPos].Modification;
			this.JSONdata.Peptides[oldPepIndex].sequence[oldPos].Modification = "";

			var pepSeq1 = "";
			for (var i = 0; i < this.JSONdata.Peptides[0].sequence.length; i++) {
				pepSeq1 += this.JSONdata.Peptides[0].sequence[i].aminoAcid;
				pepSeq1 += this.JSONdata.Peptides[0].sequence[i].Modification;
			};

			var pepSeq2 = "";
			for (var i = 0; i < this.JSONdata.Peptides[1].sequence.length; i++) {
				pepSeq2 += this.JSONdata.Peptides[1].sequence[i].aminoAcid;
				pepSeq2 += this.JSONdata.Peptides[1].sequence[i].Modification;
			};

			var newmatch = $.extend(true, {}, this.match);	//clone object

			newmatch.matchedPeptides[0].seq_mods = pepSeq1;
			newmatch.matchedPeptides[1].seq_mods = pepSeq2;

			CLMSUI.loadSpectra(newmatch, this.randId, this);
		}
		else{
			//Preview
			this.JSONdata.Peptides[newPepIndex].sequence[newPos].Modification = this.JSONdata.Peptides[oldPepIndex].sequence[oldPos].Modification;
			this.JSONdata.Peptides[oldPepIndex].sequence[oldPos].Modification = "";
			this.setData();
		}


	},

	matchMassToAA: function(delta, peak) {
		var self = this;
		var aaArray = this.aaMasses.filter(function(d){
			if(self.MSnTolerance.unit == "ppm"){
				var uplim = d.monoisotopicMass + peak * self.MSnTolerance.value * 1e-6;
				var lowlim = d.monoisotopicMass - peak * self.MSnTolerance.value * 1e-6;
				if(delta < uplim && delta > lowlim)
					return true;
			}
			//TODO: matchMass for Da error type
			// if(self.MSnTolerance.unit == "Da"){
			// 	var uplim = d.monoisotopicMass + self.MSnTolerance.value;
			// 	var lowlim = d.monoisotopicMass - self.MSnTolerance.value;
			// 	if(delta < uplim && delta > lowlim)
			// 		return d.aminoAcid;
			// }
		}).map(function(d){return d.aminoAcid});
		aaStr = aaArray.join();
		return aaStr;
	},

	checkForValidModification: function(mod, aminoAcid){

		for (var i = 0; i < this.userModifications.length; i++) {
			if(this.userModifications[i].id == mod){
				if ($.inArray(aminoAcid, this.userModifications[i].aminoAcids) != -1 || this.userModifications[i].aminoAcids == [])
					return true;
				else
					return false;
			}
		}

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

		// // don't calculate the mass if JSONdata is empty
		// if (this.JSONdata === null){
		// 	this.mass = null
		// 	return
		// }
		// don't calculate the mass if it's already defined by xiAnnotator
		if (this.annotationData !== undefined)
			if (this.annotationData.precursorMZ !== undefined && this.annotationData.precursorMZ !== -1)
				return


		//if(this.knownModifications === undefined)
		//	this.getKnownModifications();
		var aastr = "ARNDCEQGHILKMFPSTWYV";
		var mA = new Array();
		mA[aastr.indexOf("A")] = 71.03711;
		mA[aastr.indexOf("R")] = 156.10111;
		mA[aastr.indexOf("N")] = 114.04293;
		mA[aastr.indexOf("D")] = 115.02694;
		mA[aastr.indexOf("C")] = 103.00919;
		mA[aastr.indexOf("E")] = 129.04259;
		mA[aastr.indexOf("Q")] = 128.05858;
		mA[aastr.indexOf("G")] = 57.02146;
		mA[aastr.indexOf("H")] = 137.05891;
		mA[aastr.indexOf("I")] = 113.08406;
		mA[aastr.indexOf("L")] = 113.08406;
		mA[aastr.indexOf("K")] = 128.09496;
		mA[aastr.indexOf("M")] = 131.04049;
		mA[aastr.indexOf("F")] = 147.06841;
		mA[aastr.indexOf("P")] = 97.05276;
		mA[aastr.indexOf("S")] = 87.03203;
		mA[aastr.indexOf("T")] = 101.04768;
		mA[aastr.indexOf("W")] = 186.07931;
		mA[aastr.indexOf("Y")] = 163.06333;
		mA[aastr.indexOf("V")] = 99.06841;

		var massArr = new Array();
		var h2o = 18.010565;

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


		if(this.get("clModMass") !== undefined)
			var clModMass = parseInt(this.get("clModMass"));
		else if (this.annotationData !== undefined)
			var clModMass = this.annotationData['cross-linker'].modMass;


		if(clModMass !== undefined){
			for (var i = 0; i < massArr.length; i++) {
				totalMass += massArr[i];
			}
			totalMass += clModMass;
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
			url: self.xiAnnotatorBaseURL + "annotate/knownModifications",
			success: function(data) {
				self.knownModifications = data;
			},
		    error: function(xhr, status, error){
        		alert("xiAnnotator could not be reached. Please try again later!");
    		},
		});
	},


	updateKnownModifications: function(){
		var self = this;
		if(this.annotationData.modifications){
			this.annotationData.modifications.forEach(function(annotation_mod){
				var overlap = self.knownModifications["modifications"].filter(function(km){ return annotation_mod.id == km.id;});
				if (overlap.length > 0){
					overlap.forEach(function(overlap_mod){
						overlap_mod.mass = annotation_mod.massDifference;
						if(overlap_mod.aminoAcids.indexOf(annotation_mod.aminoacid) == -1)
							overlap_mod.aminoAcids.push(annotation_mod.aminoacid);
// 						overlap_mod.aminoAcids = annotation_mod.aminoAcids;
					});
				}
				else{
					//what is mass in the modification array corresponds to massDifference from xiAnnotator
					var new_mod = new Object;
					new_mod['mass'] = annotation_mod['massDifference'];
					new_mod['aminoAcids'] = [annotation_mod['aminoacid']];
					new_mod['id'] = annotation_mod['id'];
					self.knownModifications["modifications"].push(new_mod);
				}

			})
		}
	},

	updateUserModifications: function(mod, saveToCookie){
        
        if (saveToCookie === undefined) {
            saveToCookie = true;
        }

		var userMod = this.userModifications.filter(function(m){ return mod.id == m.id;});
		if (userMod.length > 0){
			userMod.forEach(function(overlap_mod){
				overlap_mod.mass = mod.mass;
				overlap_mod.aminoAcids = mod.aminoAcids;
			});
// 			userMod[0].mass = mod.mass;
// 			userMod[0].aminoAcids = mod.aminoAcids;
		}
		else
			this.userModifications.push(mod);
		if (saveToCookie)
			this.saveUserModificationsToCookie();
	},

	saveUserModificationsToCookie: function(){
		var cookie = JSON.stringify(this.userModifications);
		Cookies.set('customMods', cookie);
	},

	delUserModification: function(modId, saveToCookie){
        
        if (saveToCookie === undefined) {
            saveToCookie = true;
        }
        
		var userModIndex = this.userModifications.findIndex(function(m){ return modId == m.id;});
		if (userModIndex != -1){
			this.userModifications.splice(userModIndex, 1);
		}
		else
			console.log("Error modification "+modId+"could not be found!");
		if (saveToCookie)
			this.saveUserModificationsToCookie();
	},

	request_annotation: function(json_request){

		console.log("annotation request:", json_request);
		var self = this;
		var response = $.ajax({
			type: "POST",
			datatype: "jsonp",
			headers: {
			    'Accept': 'application/json',
			    'Content-Type': 'application/json'
			},
			data: JSON.stringify(json_request),
			async: false,
			url: self.xiAnnotatorBaseURL + "annotate/FULL",
			success: function(data) {
				//ToDo: Error handling -> talked to Lutz, he will implement transfer of error message as json
				console.log("annotation response:", data);
				self.set({"JSONdata": data, "JSONrequest": json_request});
				//self.setData();

				if (self.otherModel !== undefined){
					var json_data_copy = jQuery.extend({}, data);
					self.otherModel.set({"JSONdata": json_data_copy, "JSONrequest": json_request});
					self.otherModel.trigger("change:JSONdata");
				}
			}
		});

	}
});
