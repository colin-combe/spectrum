var AnnotatedSpectrumModel = Backbone.Model.extend({

	defaults: function() {
    return {
      baseDir:  './',
	  xiAnnotatorBaseURL: 'https://xi3.bio.ed.ac.uk/xiAnnotator/',
	  knownModifications: [],
	  knownModificationsURL: false,
    };
  },

	initialize: function(){

		var self = this;

		if(this.get('knownModificationsURL') !== false){
			this.getKnownModifications(this.get('knownModificationsURL'));
		}
		else{
			this.knownModifications = this.get('knownModifications');
		}

		this.showDecimals = 2;
		this.moveLabels = false;
		this.measureMode = false;
		this.showAllFragmentsHighlight = true;
		this.changedAnnotation = false;

		this.cmap = colorbrewer.RdBu[8];
		this.p1color = this.cmap[0];
		this.p1color_cluster = this.cmap[2];
		this.p1color_loss = this.cmap[1];
		this.p2color = this.cmap[7];
		this.p2color_cluster = this.cmap[5];
		this.p2color_loss = this.cmap[6];
		this.peakColour = "#a6a6a6";
		this.highlightColour = "#FFFF00";
		this.highlightWidth = 8;

		this.pepStrs = [];
		this.pepStrsMods = [];
		this.fragmentIons = [];
		this.peakList = [];
		this.precursorCharge = null;

		//ToDo: change JSONdata gets called 3 times for some reason?
		// define event triggers and listeners better
		this.on("change:JSONdata", function(){
			var json = this.get("JSONdata");
			if (typeof json !== 'undefined'){
				this.setData();
			}
			else
				this.trigger("cleared");
		});

		// //used for manual data input -- calcPrecursorMass disable for now
		// this.on("change:clModMass", function(){
		// 	if(this.peptides !== undefined && this.knownModifications !== undefined)
		// 		this.calcPrecursorMass();
		// });
		// this.on("change:charge", function(){
		// 	this.precursorCharge = parseInt(this.get("charge"));
		// 	this.trigger("changed:charge");
		// });
		// this.on("change:modifications", function(){
		// 	this.updateKnownModifications();
		// 	if(this.peptides !== undefined && this.knownModifications !== undefined)
		// 		this.calcPrecursorMass();
		// });

	},

	setData: function(){

		if (this.get("JSONdata") == null){
			this.trigger("changed:data");
			return;
		}

		var JSONrequest = this.get("JSONrequest");

		// if knownModifications are not set get them from the JSONrequest
		if(this.knownModifications.length == 0 && JSONrequest && JSONrequest.annotation && JSONrequest.annotation.modifications){
			this.knownModifications = JSONrequest.annotation.modifications.map(function(mod){
				 var obj = {};
				 obj.id = mod.id;
				 obj.mass = parseFloat(mod.mass);
				 obj.aminoAcids = mod.aminoAcids;
				 obj.changed = false;
				 obj.userMod = true;
				 return obj;
			 });
		}


		$("#measuringTool").prop("checked", false);
		$("#moveLabels").prop("checked", false);
		this.sticky = Array();
		this.highlights = Array();
		var JSONdata = this.get("JSONdata");

		this.annotationData = JSONdata.annotation || {};

		if (this.annotationData.fragementTolerance !== undefined){
			this.MSnTolerance = {
				"value": parseFloat(this.annotationData.fragementTolerance.split(" ")[0]),
				"unit": this.annotationData.fragementTolerance.split(" ")[1]
			};
		}

		this.fragmentIons = this.annotationData.ions || [];
		this.peakList = JSONdata.peaks || [];
		this.precursorCharge = this.annotationData.precursorCharge || this.get("charge");
		var crossLinker = this.annotationData['cross-linker'];
		if (this.annotationData['cross-linker'] !== undefined)
			this.crossLinkerModMass = crossLinker.modMass;

		this.pepStrs = [];
		this.pepStrsMods = [];
		this.peptides = JSONdata.Peptides;
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
		if (JSONdata.fragments !== undefined){
			this.fragments = [];
			for (var i = 0; i < JSONdata.fragments.length; i++) {
				this.fragments[i] = JSONdata.fragments[i];
				this.fragments[i].id = i;
			};
		};

		// this.calcPrecursorMass();

		this.trigger("changed:data");

		if (JSONdata.peaks !== undefined)
			this.setGraphData();

	},

	peaksToMGF: function(){
		var output = "";
		for (var i = 0; i < this.peakList.length; i++) {
			output += this.peakList[i].mz + "	";
			output += this.peakList[i].intensity + "\n";
		}
		return output;
	},

	clear: function(){
		this.set("JSONdata", null);
		this.sticky = Array();
		Backbone.Model.prototype.clear.call(this);
	},

	setGraphData: function(){

		var peaks = this.get("JSONdata").peaks;

		var xmin = Number.POSITIVE_INFINITY;
		var xmax = Number.NEGATIVE_INFINITY;
		var tmp;
		for (var i=peaks.length-1; i>=0; i--) {
		    tmp = peaks[i].mz;
		    if (tmp < xmin) xmin = tmp;
		    if (tmp > xmax) xmax = tmp;
		}

		this.xmaxPrimary = xmax + 50;
		this.xminPrimary = xmin - 50;
		var ymax = Number.NEGATIVE_INFINITY;
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
		this.xmin = domain[0].toFixed(0);
		this.xmax = domain[1].toFixed(0);
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
			var clearHighlights = []
			if(this.sticky.length != 0){


				for(f = 0; f < this.sticky.length; f++){
					if (fragments.indexOf(this.sticky[f]) == -1)
						clearHighlights.push(this.sticky[f]);
				}
				this.sticky = [];
			}
			for(f = 0; f < fragments.length; f++)
				this.sticky.push(fragments[f]);

			this.clearHighlight(clearHighlights);
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
			json_req = $.extend(true, {}, this.get("JSONrequest"));
			for (var i = 0; i < newLinkSites.length; i++) {
				json_req.LinkSite[i].linkSite = newLinkSites[i]-1;
			}
			this.request_annotation(json_req);
		}
		else{
			for (var i = 0; i < newLinkSites.length; i++) {
				if (this.get("JSONdata").LinkSite[i] === undefined){
					this.get("JSONdata").LinkSite[i] = {id: 0, linkSite: newLinkSites[i], peptideId: i}
				}
				else
					this.get("JSONdata").LinkSite[i].linkSite = newLinkSites[i];
			}
			this.setData();
		}

		this.trigger("changed:annotation");
		this.changedAnnotation = true;
	},


	changeMod: function(oldPos, newPos, oldPepIndex, newPepIndex){

		if(this.get("JSONrequest") !== undefined){
			json_req = $.extend(true, {}, this.get("JSONrequest"));
			//standalone
			var myNew = json_req.Peptides[newPepIndex].sequence[newPos];
			var myOld = this.get("JSONdata").Peptides[oldPepIndex].sequence[oldPos];

			myNew.Modification = myOld.Modification;
			json_req.Peptides[oldPepIndex].sequence[oldPos].Modification = "";

			if (myNew.aminoAcid != myOld.aminoAcid){
				var annotationMod = $.grep(json_req.annotation.modifications, function(e){ return e.id == myNew.Modification; });
				if (annotationMod[0].aminoAcids.indexOf(myNew.aminoAcid) === -1)
					annotationMod[0].aminoAcids.push(myNew.aminoAcid);
			}
			this.request_annotation(json_req);
		}
		else{
			//Preview
			this.get("JSONdata").Peptides[newPepIndex].sequence[newPos].Modification = this.get("JSONdata").Peptides[oldPepIndex].sequence[oldPos].Modification;
			this.get("JSONdata").Peptides[oldPepIndex].sequence[oldPos].Modification = "";
			this.setData();
		}

		this.trigger("changed:annotation");
		this.changedAnnotation = true;
	},

	checkForValidModification: function(mod, aminoAcid){

		for (var i = 0; i < this.knownModifications.length; i++) {
			if(this.knownModifications[i].id == mod){
				var knownMod_aminoAcids = this.knownModifications[i].aminoAcids;
				if (knownMod_aminoAcids.indexOf('*') != -1 || knownMod_aminoAcids.indexOf(aminoAcid) != -1)
					return true;
				else
					return false;
			}
		}
	},

	calcPrecursorMass: function(){

		var JSONdata = this.get("JSONdata");

		// // don't calculate the mass if JSONdata is empty
		// if (JSONdata === null){
		// 	this.mass = null
		// 	return
		// }
		// don't calculate the mass if it's already defined by xiAnnotator
		if (this.annotationData !== undefined)
			if (this.annotationData.precursorMZ !== undefined && this.annotationData.precursorMZ !== -1)
				return;

		if(this.annotationData.modifications === undefined)
			return;

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
			// 	this.modifications.data = JSONdata.annotation.modifications;
			// }
			massArr[i] = h2o;
			for (var j = 0; j < this.peptides[i].sequence.length; j++) {
				var AA = this.peptides[i].sequence[j].aminoAcid;
				massArr[i] += mA[aastr.indexOf(AA)];
				//mod
				var mod = this.peptides[i].sequence[j].Modification;
				if(mod != ""){
					for (var k = 0; k < this.annotationData.modifications.length; k++) {
						if (this.annotationData.modifications[k].id == mod)
						massArr[i] += this.annotationData.modifications[k].massDifference;
					}
				}
			}
		}

		var totalMass = 0;
		var clModMass = 0;
		if(this.get("clModMass") !== undefined)
			var clModMass = parseInt(this.get("clModMass"));
		else if (this.annotationData['cross-linker'] !== undefined)
			var clModMass = this.annotationData['cross-linker'].modMass;

		for (var i = 0; i < massArr.length; i++) {
			totalMass += massArr[i];
		}
		// NOT Multilink future proof
		if(JSONdata.LinkSite.length > 1){
			if (JSONdata.LinkSite[0].linkSite != -1 && JSONdata.LinkSite[1].linkSite != -1)
				totalMass += clModMass;
		}
		this.calc_precursor_mass = totalMass;
		this.trigger("changed:mass");
	},

	getKnownModifications: function(modifications_url){

		var self = this;
		var response = $.ajax({
			type: "GET",
			datatype: "json",
			async: false,
			url: modifications_url,
			success: function(data) {
				for (var i = 0; i < data.modifications.length; i++) {
					data.modifications[i].changed = false;
					data.modifications[i].userMod = false;
					// data.modifications[i].original = false;
				}
				self.knownModifications = data.modifications;

			},
			error: function(xhr, status, error){
				alert("xiAnnotator could not be reached. Please try again later!");
			},
		});
	},

	updateModification: function(update_mod){
		var found = false;
		for (var i=0; i < this.knownModifications.length; i++) {
			if (this.knownModifications[i].id === update_mod.id) {
				found = true;
				// if it's not a changed mod save before overwriting
				if(!this.knownModifications[i].changed && !this.knownModifications[i].userMod){
					this.knownModifications[i].changed = true;
					this.knownModifications[i].original = {
						mass: this.knownModifications[i].mass,
						aminoAcids: this.knownModifications[i].aminoAcids
						};
				}
				this.knownModifications[i].mass = update_mod.mass;
				this.knownModifications[i].aminoAcids = update_mod.aminoAcids;
				return this.knownModifications[i];
			}
		}

		if (!found){
			update_mod.userMod = true;
			this.knownModifications.push(update_mod);
			return update_mod;
		}
	},

	resetModification: function(updateModId){
		for (var i=0; i < this.knownModifications.length; i++) {
			if (this.knownModifications[i].id === updateModId) {
				if(this.knownModifications[i].changed){
					this.knownModifications[i].changed = false;
					this.knownModifications[i].mass = this.knownModifications[i].original.mass;
					this.knownModifications[i].aminoAcids = this.knownModifications[i].original.aminoAcids;
					this.knownModifications[i].original = undefined;
				}
				break;
			}
		}

	},

	reset_all_modifications: function(){
		for (var i=0; i < this.knownModifications.length; i++) {
			this.resetModification(this.knownModifications[i].id);
		}
	},

	// saveUserModificationsToCookie: function(){
	// 	var cookie = JSON.stringify(this.userModifications);
	// 	Cookies.set('customMods', cookie);
	// },

	// delUserModification: function(modId, saveToCookie){	// IE 11 borks at new es5/6 syntax, saveCookie=true
	//
	// 	if (saveToCookie === undefined) {
	// 		saveToCookie = true;
	// 	}
	// 	var userModIndex = this.userModifications.findIndex(function(m){ return modId == m.id;});
	// 	if (userModIndex != -1){
	// 		this.userModifications.splice(userModIndex, 1);
	// 	}
	// 	else
	// 		console.log("Error modification "+modId+"could not be found!");
	// 	if (saveToCookie)
	// 		this.saveUserModificationsToCookie();
	// },

	request_annotation: function(json_request, originalMatch){

		if (originalMatch === undefined) originalMatch = false;
		if (originalMatch){
			this.changedAnnotation = false;
			this.originalMatchRequest = $.extend(true, {}, json_request);
			this.reset_all_modifications();
		}

		json_request['annotation']['custom'] = this.customConfig;
		if (!this.keepCustomConfig) this.customConfig = '';

		if (json_request.annotation.requestID)
			this.lastRequestedID = json_request.annotation.requestID;
		// else {
		// 	this.lastRequestedID = -1;
		// }

		this.trigger('request_annotation:pending');
		console.log("annotation request:", json_request);
		var self = this;
		var response = $.ajax({
			type: "POST",
			headers: {
			    'Accept': 'application/json',
			    'Content-Type': 'application/json'
			},
			data: JSON.stringify(json_request),
			// async: false,
			url: self.get('xiAnnotatorBaseURL') + "annotate/FULL",
			success: function(data) {
				if (data && data.annotation && data.annotation.requestID && data.annotation.requestID === self.lastRequestedID) {
					//ToDo: Error handling -> https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/330
					console.log("annotation response:", data);
					self.set({"JSONdata": data, "JSONrequest": json_request});

					if (self.otherModel !== undefined){
						var json_data_copy = jQuery.extend({}, data);
						self.otherModel.set({"JSONdata": json_data_copy, "JSONrequest": json_request});
						self.otherModel.trigger("change:JSONdata");
					}
					self.trigger('request_annotation:done');
				}

			}
		});
	},

	revert_annotation: function(){
// 		this.userModifications = [];
// 		this.otherModel.userModifications = [];
		if(!this.changedAnnotation)
			return
		else {
			this.reset_all_modifications();
			this.otherModel.reset_all_modifications();
			this.request_annotation(this.originalMatchRequest);
		}
	},

	resetModel: function(){

		// used to reset SettingsModel
		var json_data_copy = jQuery.extend({}, this.otherModel.get("JSONdata"));
		var json_request_copy =  jQuery.extend({}, this.otherModel.get("JSONrequest"));
		this.knownModifications = jQuery.extend(true, [], this.otherModel.knownModifications);
		this.set({"JSONdata": json_data_copy, "JSONrequest": json_request_copy});
		this.trigger("change:JSONdata");

	},
});
