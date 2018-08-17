//		a spectrum viewer
//
//	  Copyright  2015 Rappsilber Laboratory, Edinburgh University
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
//		authors: Lars Kolbowski
//
//
//		SpectrumView2.js

var xiSPEC = xiSPEC || {};
var CLMSUI = CLMSUI || {};

var SpectrumView = Backbone.View.extend({

	events : {
	  },

	initialize: function() {
		this.spinner = new Spinner({scale: 5});
		this.svg = d3.select(this.el.getElementsByTagName("svg")[0]);//d3.select(this.el)
				//~ .append("svg").style("width", "100%").style("height", "100%");

		//create graph
		var graphOptions = {xlabel:"m/z", ylabelLeft:"Intensity", ylabelRight:"% of base Peak"};
		this.graph = new Graph (this.svg, this.model, graphOptions);

		$(this.el).css('background-color', '#fff');

		this.listenTo(window, 'resize', _.debounce(this.resize));

		this.listenTo(this.model, 'change:JSONdata', this.render);
		this.listenTo(this.model, 'change:lockZoom', this.lockZoom);
		this.listenTo(this.model, 'change:measureMode', this.measuringTool);
		this.listenTo(this.model, 'change:moveLabels', this.moveLabels);
		this.listenTo(this.model, 'change:changedAnnotation', this.changedAnnotation);
		this.listenTo(this.model, 'change:highlightColor', this.updateHighlightColors);
		this.listenTo(this.model, 'changed:ColorScheme', this.updateColors);

		this.listenTo(xiSPEC.vent, 'downloadSpectrumSVG', this.downloadSVG);
		this.listenTo(xiSPEC.vent, 'resize:spectrum', this.resize);
		this.listenTo(xiSPEC.vent, 'clearSpectrumHighlights', this.clearHighlights);

		this.listenTo(this.model, 'resetZoom', this.resetZoom);
		this.listenTo(this.model, 'changed:Highlights', this.updateHighlights);
		this.listenTo(this.model, 'changed:lossyShown', this.showLossy);
		this.listenTo(this.model, 'request_annotation:pending', this.showSpinner);
		this.listenTo(this.model, 'request_annotation:done', this.hideSpinner);
		this.listenTo(this.model, 'changed:fragHighlighting', this.updatePeakHighlighting);
		//this.listenTo(this.model, 'destroy', this.remove);
	},

	render: function() {
		// if (!this.model.get('changedAnnotation')){
		// 	this.disableRevertAnnotation();
		// }
		this.graph.clear();
		// this.lockZoom();
		if (this.model.get("JSONdata"))
			this.graph.setData();
		// this.hideSpinner();
	},

	resetZoom: function(){
		this.graph.resize(this.model.xminPrimary, this.model.xmaxPrimary, this.model.ymin, this.model.ymaxPrimary);
	},

	resize: function(){
		var mzRange = this.model.get('mzRange');
		if (mzRange === undefined)
			return;
		this.graph.resize(mzRange[0], mzRange[1], this.model.ymin, this.model.ymax);
	},

	showLossy: function(e){
		this.graph.lossyShown = this.model.lossyShown;
		this.graph.updatePeakLabels();
	},

	lockZoom: function(){

		if(this.model.get('lockZoom')){
			this.graph.disableZoom();
		}
		else{
			this.graph.enableZoom();
		}
	},

	clearHighlights: function(){
		this.model.clearStickyHighlights();
	},

	updateColors: function(){
		this.graph.updateColors();
	},

	updatePeakHighlighting: function(){
		this.graph.updatePeakLabels();
		this.graph.updatePeakColors();
	},

	updateHighlightColors: function(){
		this.graph.updateHighlightColors();
	},

	updateHighlights: function(){

		var peaks = this.graph.peaks;

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

	measuringTool: function(){
		this.graph.measure(this.model.get('measureMode'));
	},

	moveLabels: function(){

		var peaks = this.graph.peaks;

		if (this.model.get('moveLabels')){
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
						//.style("cursor", "default")
					;
				}
			}
		}

	},

	downloadSVG: function(){
		var svgSel = d3.select(this.el).selectAll("svg");
		var svgArr = svgSel[0];
		var svgStrings = CLMSUI.svgUtils.capture (svgArr);
		var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);

		var charge = this.model.get("JSONdata").annotation.precursorCharge;
		var pepStrs = this.model.pepStrsMods;
		var linkSites = Array(this.model.get("JSONdata").LinkSite.length);

		this.model.get("JSONdata").LinkSite.forEach(function(ls){
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

		var svg_name = pepStrs.join("-") + "_z=" + charge;
		svg_name += svgSel.node().id;
		svg_name += ".svg";
		download (svgXML, 'application/svg', svg_name);
	},

	showSpinner: function(){
		this.graph.clear();
		this.spinner.spin(d3.select(this.el).node());
	},

	hideSpinner: function(){
		this.spinner.stop();
	},

	changedAnnotation: function(){
		if(this.model.get('changedAnnotation')){
			$(this.el).css('background-color', 'rgb(210, 224, 255)');
		}
		else{
			$(this.el).css('background-color', '#fff');
		}
	},

});
