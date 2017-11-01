var SpectrumView = Backbone.View.extend({

	events : {
		'click #reset' : 'resetZoom',
		'click #lossyChkBx': 'showLossy',
		'submit #setrange' : 'setrange',
		'click #lockZoom' : 'lockZoom',
		'click #clearHighlights' : 'clearHighlights',
		'change #colorSelector': 'changeColorScheme',
		'click #measuringTool': 'measuringTool',
		'click #moveLabels': 'moveLabels',
		'click #downloadSVG': 'downloadSVG',
		'click #toggleView' : 'toggleView',
	  },

	initialize: function() {

		this.svg = d3.select(this.el.getElementsByTagName("svg")[0]);//d3.select(this.el)
				//~ .append("svg").style("width", "100%").style("height", "100%");


		//create graph
		this.graph = new Graph (this.svg, this.model, {xlabel:"m/z", ylabelLeft:"Intensity", ylabelRight:"% of base Peak"});

		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, "changed:Zoom", this.updateRange);
		this.listenTo(window, 'resize', _.debounce(this.resize));
		this.listenTo(this.model, 'changed:ColorScheme', this.updateColors);
		this.listenTo(this.model, 'changed:HighlightColor', this.updateHighlightColors);
		this.listenTo(this.model, 'changed:Highlights', this.updateHighlights);
		//this.listenTo(this.model, 'destroy', this.remove);
	},

	render: function() {
		this.graph.clear();
		this.lockZoom();
		if (this.model.JSONdata)
			this.graph.setData();

	},

	resetZoom: function(){
		this.graph.resize(this.model.xminPrimary, this.model.xmaxPrimary, this.model.ymin, this.model.ymaxPrimary);
	},

	resize: function(){
		this.graph.resize(this.model.xmin, this.model.xmax, this.model.ymin, this.model.ymax);
	},

	showLossy: function(e){
		var $target = $(e.target);
        var selected = $target .is(':checked');
        //this.model.lossyShown = selected;
		this.graph.lossyShown = selected;
		this.graph.updatePeakLabels();
	},

	setrange: function(e){
		e.preventDefault();
		var xl = xleft.value-0;
		var xr = xright.value-0;
		if (xl > xr){
			$("#range-error").show();
			$("#range-error").html("Error: "+xl+" is larger than "+xr);
		}
		else{
			$("#range-error").hide();
			this.graph.resize(xl, xr, this.model.ymin, this.model.ymax);
		}

	},

	updateRange: function(){

		$("#xleft").val(this.model.xmin);
		$("#xright").val(this.model.xmax);
	},

	lockZoom: function(){
		if (!this.model.showSpectrum)
			return
		if ($('#lockZoom').is(':checked')) {
			$('#lock')[0].innerHTML = "&#128274";
			$('#rangeSubmit').prop('disabled', true);
			$('#xleft').prop('disabled', true);
			$('#xright').prop('disabled', true);
			this.model.lockZoom = true;
			this.graph.disableZoom();
		} else { 
			$('#lock')[0].innerHTML = "&#128275";
			$('#rangeSubmit').prop('disabled', false);
			$('#xleft').prop('disabled', false);
			$('#xright').prop('disabled', false);
			this.model.lockZoom = false;
			this.graph.enableZoom();
		}

	},

	toggleView: function(){
		if (this.model.showSpectrum){
			$('#toggleView')[0].innerHTML = "Spectrum";
			$('#lock').css("cursor", "not-allowed");
			$('#moveLabels').prop('disabled', true);
			$('#measuringTool').prop('disabled', true);
			$('#reset').prop('disabled', true);
			$('#rangeSubmit').prop('disabled', true);
			$('#xleft').prop('disabled', true);
			$('#xright').prop('disabled', true);

			this.model.lockZoom = true;
			this.model.showSpectrum = false;
			this.graph.hide();
		}
		else{
			$('#toggleView')[0].innerHTML = "QC";
			$('#lock').css("cursor", "pointer");
			$('#moveLabels').prop('disabled', false);
			$('#measuringTool').prop('disabled', false);
			$('#reset').prop('disabled', false);
			$('#rangeSubmit').prop('disabled', false);
			$('#xleft').prop('disabled', false);
			$('#xright').prop('disabled', false);
			this.model.showSpectrum = true;
			this.graph.show();
		}
	},

	clearHighlights: function(){
		this.model.clearStickyHighlights();
	},

	changeColorScheme: function(e){
		this.model.changeColorScheme(e.target.value);
	},

	updateColors: function(){
		this.graph.updateColors();
	},

	updateHighlightColors: function(){
		this.graph.updateHighlightColors();
	},

	updateHighlights: function(){

		var peaks = this.graph.points;

		for(p = 0; p < peaks.length; p++){
			if(peaks[p].fragments.length > 0)
				peaks[p].highlight(false);
			
			var highlightFragments = _.intersection(peaks[p].fragments, this.model.highlights);
			if(highlightFragments.length != 0){
				peaks[p].highlight(true, highlightFragments);
			}
		}
		this.graph.updatePeakColors();
		this.graph.updatePeakLabels();
	},
	
	measuringTool: function(e){
		var $target = $(e.target);
        var selected = $target .is(':checked');
        this.model.measureMode = selected;
		this.graph.measure(selected);
	},

	moveLabels: function(e){

		var $target = $(e.target);
        var selected = $target.is(':checked');
        this.model.moveLabels = selected;
		
		var peaks = this.graph.points;

		if (selected){
			// for(p = 0; p < peaks.length; p++){
			// 	if(peaks[p].labels){
			// 		for(l = 0; l < peaks[p].labels.length; l++){
			// 			peaks[p].labels[l].call(peaks[p].labelDrag);
			// 			peaks[p].labels[l].style("cursor", "pointer");
			// 		}
			// 	}
			// }	
			for(p = 0; p < peaks.length; p++){
				if(peaks[p].labels.length){
						peaks[p].labels
							.call(peaks[p].labelDrag)
							//.style("cursor", "pointer");
				}
			}
		}
		else{
			for(p = 0; p < peaks.length; p++){
				if(peaks[p].labels.length){
						peaks[p].labels
							.on(".drag", null)
							//.style("cursor", "default");
				}
			}			
		}

	},
	downloadSVG:function(){
            var svgSel = d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);

            var charge = this.model.JSONdata.annotation.precursorCharge;
            var pepStrs = this.model.pepStrsMods;
            var linkSites = Array(this.model.JSONdata.LinkSite.length);

            this.model.JSONdata.LinkSite.forEach(function(ls){
            	linkSites[ls.peptideId] = ls.linkSite;
            });

            //insert CL sites with #
            if (linkSites.length > 0){

	            var ins_pepStrs = Array();
	            pepStrs.forEach(function(pepStr, index){
					var positions = [];
					for(var i=0; i<pepStr.length; i++){
					    if(pepStr[i].match(/[A-Z]/) != null){
					        positions.push(i);
					    };
					}
					var clAA_index = positions[linkSites[index]]+1;
	           		var ins_pepStr = pepStr.slice(0, clAA_index) + "#" + pepStr.slice(clAA_index, pepStr.length);
	           		pepStrs[index] = ins_pepStr;
	            })
	        }

            var svg_name = pepStrs.join("-") + "_z=" + charge + ".svg";

            download (svgXML, 'application/svg', svg_name);
    },
});
