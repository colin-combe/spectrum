//    xiSPEC Spectrum Viewer
//    Copyright 2016 Rappsilber Laboratory, University of Edinburgh
//
//    This product includes software developed at
//    the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//    author: Lars Kolbowski
//
//    Wrapper.js

"use strict";

var xiSPEC = {};
var CLMSUI = CLMSUI || {};
// http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views
CLMSUI.vent = {};
_.extend (CLMSUI.vent, Backbone.Events);

_.extend(window, Backbone.Events);
window.onresize = function() { window.trigger('resize') };

xiSPEC.init = function(
	targetDiv,
	model_variables
) {
	if (model_variables === undefined)	model_variables = {};

	// targetDiv could be div itself or id of div - lets deal with that
	if (typeof targetDiv === "string"){
		if(targetDiv.charAt(0) == "#") targetDiv = targetDiv.substr(1);
		this.targetDiv = document.getElementById(targetDiv);
	} else {
		this.targetDiv = targetDiv;
	}

	d3.select(this.targetDiv).selectAll("*").remove();

	//init models
	this.SpectrumModel = new AnnotatedSpectrumModel(model_variables);
	this.SettingsSpectrumModel = new AnnotatedSpectrumModel(model_variables);
	this.SpectrumModel.otherModel = this.SettingsSpectrumModel;
	this.SettingsSpectrumModel.otherModel = this.SpectrumModel;

	var _html = ""
		+"<div class='xispec_dynDiv' id='xispec_settingsWrapper'>"
		+"	<div class='xispec_dynDiv_moveParentDiv'>"
		+"		<span class='xispec_dynTitle'>Spectrum settings</span>"
		+"		<i class='fa fa-times-circle settingsCancel' id='closeSettings'></i>"
		+"	</div>"
		+"	<div class='xispec_dynDiv_resizeDiv_tl draggableCorner'></div>"
		+"	<div class='xispec_dynDiv_resizeDiv_tr draggableCorner'></div>"
		+"	<div class='xispec_dynDiv_resizeDiv_bl draggableCorner'></div>"
		+"	<div class='xispec_dynDiv_resizeDiv_br draggableCorner'></div>"
		+"</div>"
		+"<div id='xispec_spectrumControls'>"
		+"<span id='xispec_extra_spectrumControls_before'></span>"
		+'<i class="xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-download" aria-hidden="true" id="xispec_dl_spectrum_SVG" title="download SVG" style="cursor: pointer;"></i>'
		+"<label class='xispec_btn'>Move Labels<input id='moveLabels' type='checkbox'></label>"
		+'<label class="xispec_btn" title="toggle measure mode on/off">Measure<input class="pointer" id="measuringTool" type="checkbox"></label>'
		+'<form id="setrange">'
		+'	<label class="xispec_btn" title="m/z range" style="cursor: default;">m/z:</label>'
		+'	<label class="xispec_btn" for="lockZoom" title="Lock current zoom level" id="lock" class="xispec_btn">🔓</label><input id="lockZoom" type="checkbox" style="display: none;">'
		+'	<input type="text" id="xleft" size="5" title="m/z range from:">'
		+'	<span>-</span>'
		+'	<input type="text" id="xright" size="5" title="m/z range to:">'
		+'	<input type="submit" id="rangeSubmit" value="Set" class="xispec_btn xispec_btn-1 xispec_btn-1a" style="display: none;">'
		+'	<span id="range-error"></span>'
		+'	<button id="reset" title="Reset to initial zoom level" class="xispec_btn xispec_btn-1 xispec_btn-1a">Reset Zoom</button>'
		+'</form>'
		+'<i id="toggleSettings" title="Show/Hide Settings" class="xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-cog" aria-hidden="true"></i>'
		+'<i id="xispec_revertAnnotation" title="revert to original annotation" class="xispec_btn xispec_btn-topNav fa fa-undo xispec_disabled"  aria-hidden="true"></i>'
		+"<span id='xispec_extra_spectrumControls_after'></span>"
		+'<a href="http://spectrumviewer.org/help.php" target="_blank"><i title="Help" class="xispec_btn xispec_btn-1a xispec_btn-topNav fa fa-question" aria-hidden="true"></i></a>'
		+"</div>"
		+"</div>"
		+"<div class='xispec_plotsDiv'>"
		+"  <div id='xispec_spectrumMainPlotDiv'>"
		+"      <svg id='xispec_spectrumSVG'></svg>"
		+"      <div id='xispec_measureTooltip'></div>"
		+"  </div>"
		+"  <div id='xispec_QCdiv'>"
		+"      <div class='xispec_subViewHeader'></div>"
		+"      <div class='xispec_subViewContent'>"
		+"          <div class='xispec_subViewContent-plot' id='xispec_subViewContent-left'><svg id='xispec_errIntSVG' class='xispec_errSVG'></svg></div>"
		+"          <div class='xispec_subViewContent-plot' id='xispec_subViewContent-right'><svg id='xispec_errMzSVG' class='xispec_errSVG'></svg></div>"
		+"      </div>"
		+"  </div>"
		+"</div>"
		+"</div>"
	;

	d3.select(this.targetDiv)
		// .classed ("xiSPECwrapper", true)
		.append("div")
		// .attr ("class", "verticalFlexContainer")
		.attr ("id", 'xispec_spectrumPanel')
		// http://stackoverflow.com/questions/90178/make-a-div-fill-the-height-of-the-remaining-screen-space?rq=1
		//.style ("display", "table")
		.html (_html)
	;

	this.Spectrum = new SpectrumView({model: this.SpectrumModel, el:"#xispec_spectrumPanel"});
	this.FragmentationKey = new FragmentationKeyView({model: this.SpectrumModel, el:"#xispec_spectrumMainPlotDiv"});
	this.InfoView = new PrecursorInfoView ({model: this.SpectrumModel, el:"#xispec_spectrumPanel"});
	this.QCwrapper = new QCwrapperView({el: '#xispec_QCdiv'});
	this.ErrorIntensityPlot = new ErrorPlotView({
		model: this.SpectrumModel,
		el:"#xispec_subViewContent-left",
		xData: 'Intensity',
		margin: {top: 10, right: 30, bottom: 20, left: 65},
		svg: "#xispec_errIntSVG",
	});
	this.ErrorMzPlot = new ErrorPlotView({
		model: this.SpectrumModel,
		el:"#xispec_subViewContent-right",
		xData: 'm/z',
		margin: {top: 10, right: 30, bottom: 20, left: 65},
		svg: "#xispec_errMzSVG",
	});
	CLMSUI.vent.trigger('show:QC', true);

	this.SettingsView = new SpectrumSettingsView({
		model: this.SettingsSpectrumModel,
		el:"#xispec_settingsWrapper",
		showCustomCfg: false,
	});


};

xiSPEC.setData = function(data){
	// EXAMPLE:
	// xiSPEC.setData({
	// sequence1: "KQTALVELVK",
    // sequence2: "QNCcarbamidomethylELFEQLGEYKFQNALLVR",
    // linkPos1: 1,
    // linkPos2: 13,
	// 	crossLinkerModMass: 0,
	//	modifications: [{id: 'carbamidomethyl', mass: 57.021464, aminoAcids: ['C']}],
	//	precursorCharge: 3,
	//	fragmentTolerance: {"tolerance": '20.0', 'unit': 'ppm'},
	//	ionTypes: "peptide;b;y",
	//	precursorMz: 1012.1,
	//	peaklist: [[mz, int], [mz, int], ...],
	//	requestId: 1,
	// }


	// if (!ignoreResultUnlessLastRequested || (json && json.annotation && json.annotation.requestId && json.annotation.requestId === CLMSUI.loadSpectra.lastRequestedID)) {
// 	if (data.annotation && data.annotation.requestId && json.annotation.requestId === CLMSUI.loadSpectra.lastRequestedID)) {

	var json_request = this.convert_to_json_request(data);

	this.SpectrumModel.request_annotation(json_request, true);

};

xiSPEC.sanityChecks = function(data){

	// ToDo: create sanityChecks
	// if(data.sequence2 !== undefined){
	// 	if(data.linkPos1 === undefined || data.linkPos2 === undefined){
	// 		alert('sequence')
	// 		return false;
	// 	}
	// }

	return true;
};

xiSPEC.convert_to_json_request = function (data) {

	if (!this.sanityChecks(data)) return false;


	// defaults
	if(data.ionTypes === undefined){
		data.ionTypes = "peptide;b;y";
	}
	if(data.crossLinkerModMass === undefined){
		data.crossLinkerModMass = 0;
	}
	if(data.modifications === undefined){
		data.modifications = [];
	}
	if(data.fragmentTolerance === undefined){
		data.fragmentTolerance = {"tolerance": '20.0', 'unit': 'ppm'};
	}
	if(data.requestID === undefined){
		data.requestID = -1;
	}


	var annotationRequest = {};
    var peptides = [];
    var linkSites = [];
    peptides[0] = xiSPEC.arrayifyPeptide(data.sequence1);

	if(data.linkPos1 !== undefined){
    	linkSites[0] = {"id":0, "peptideId":0, "linkSite": data.linkPos1};
	}
    if (data.sequence2 !== undefined) {
        peptides[1] = xiSPEC.arrayifyPeptide(data.sequence2);
        linkSites[1] = {"id":0, "peptideId":1, "linkSite": data.linkPos2}
    }

	var peaks = [];
	for (var i = 0; i < data.peaklist.length; i++) {
		peaks.push(
			{"intensity": data.peaklist[i][1], "mz": data.peaklist[i][0]}
		);
	}

    annotationRequest.Peptides = peptides;
    annotationRequest.LinkSite = linkSites;
	annotationRequest.peaks = peaks;
    annotationRequest.annotation = {};

    var ionTypes = data.ionTypes.split(";");
    var ionTypeCount = ionTypes.length;
    var ions = [];
    for (var it = 0; it < ionTypeCount; it++) {
        var ionType = ionTypes[it];
        ions.push({"type": (ionType.charAt(0).toUpperCase() + ionType.slice(1) + "Ion")});
    }
    annotationRequest.annotation.fragmentTolerance = data.fragmentTolerance;
	annotationRequest.annotation.modifications = data.modifications;
	annotationRequest.annotation.ions = ions;
    annotationRequest.annotation["cross-linker"] = {'modMass': data.crossLinkerModMass}; // yuk
    annotationRequest.annotation.precursorMZ = +data.precursorMZ;
    annotationRequest.annotation.precursorCharge = +data.precursorCharge;
	annotationRequest.annotation.custom = [];
	annotationRequest.annotation.requestID = data.requestID.toString();

    console.log("request", annotationRequest);
	return annotationRequest;

};

xiSPEC.arrayifyPeptide = function (seq_mods) {
    var peptide = {};
    peptide.sequence = [];

    var seq_AAonly = seq_mods.replace(/[^A-Z]/g, '')
    var seq_length = seq_AAonly.length;

    for (var i = 0; i < seq_length; i++) {
        peptide.sequence[i] = {"aminoAcid":seq_AAonly[i], "Modification": ""}
    }

    var re = /[^A-Z]+/g;
    var offset = 1;
	var result;
    while (result = re.exec(seq_mods)) {
        peptide.sequence[result.index - offset]["Modification"] = result[0];
		offset += result[0].length;
    }
    return peptide;
};

xiSPEC.matchMassToAA = function(mass, tolerance) {

	if (tolerance === undefined) tolerance = 0.01;

	var aminoAcids = [
		{"aminoAcid": "A", "monoisotopicMass": 71.03711},
		{"aminoAcid": "R", "monoisotopicMass": 156.10111},
		{"aminoAcid": "N", "monoisotopicMass": 114.04293},
		{"aminoAcid": "D", "monoisotopicMass": 115.02694},
		{"aminoAcid": "C", "monoisotopicMass": 103.00919},
		{"aminoAcid": "E", "monoisotopicMass": 129.04259},
		{"aminoAcid": "Q", "monoisotopicMass": 128.05858},
		{"aminoAcid": "G", "monoisotopicMass": 57.02146},
		{"aminoAcid": "H", "monoisotopicMass": 137.05891},
		{"aminoAcid": "I", "monoisotopicMass": 113.08406},
		{"aminoAcid": "L", "monoisotopicMass": 113.08406},
		{"aminoAcid": "K", "monoisotopicMass": 128.09496},
		{"aminoAcid": "M", "monoisotopicMass": 131.04049},
		{"aminoAcid": "F", "monoisotopicMass": 147.06841},
		{"aminoAcid": "P", "monoisotopicMass": 97.05276},
		{"aminoAcid": "S", "monoisotopicMass": 87.03203},
		{"aminoAcid": "T", "monoisotopicMass": 101.04768},
		{"aminoAcid": "W", "monoisotopicMass": 186.07931},
		{"aminoAcid": "Y", "monoisotopicMass": 163.06333},
		{"aminoAcid": "V", "monoisotopicMass": 99.06841}
	]

	var aaArray = aminoAcids.filter(function(d){
		if (Math.abs(mass - d.monoisotopicMass) < tolerance)
			return true;
	}).map(function(d){return d.aminoAcid});

	return aaArray.join();
};
