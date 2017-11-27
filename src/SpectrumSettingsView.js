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
//		authors: Lars Kolbowski
//
//
//		SpectrumSettingsView.js

var CLMSUI = CLMSUI || {};

var SpectrumSettingsView = CLMSUI.utils.BaseFrameView.extend({

	events: function() {
		var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
		if (_.isFunction(parentEvents)) {
				parentEvents = parentEvents();
		}
		return _.extend ({}, parentEvents, {
			'click #lossyChkBx': 'showLossy',
			'change #colorSelector': 'changeColorScheme',
			'click .settingsTab' : 'changeTab',
			'click .settingsCancel' : 'cancel',
			'change #settingsDecimals' : 'changeDecimals',
			'change #highlightColor' : 'updateJScolor',
			'click #settingsCustomCfgApply' : 'applyCustomCfg',
			'submit #settingsForm' : 'applyData',
			'change .ionSelectChkbox': 'updateIons'
		});
	},

	identifier: "Spectrum Settings",

	initialize: function() {
		SpectrumSettingsView.__super__.initialize.apply (this, arguments);
		var self = this;

		this.listenTo(CLMSUI.vent, 'spectrumSettingsShow', this.bringToTop);
		this.listenTo(CLMSUI.vent, 'spectrumSettingsToggle', this.toggleView);
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, 'change:JSONdata', this.render);
		this.wrapper = d3.select(this.el);

		//borrowed from CLMSUI.BaseframeView
		// add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
		var drag = d3.behavior.drag().on ("dragend", function() { self.modTable.draw(); });
		this.wrapper.selectAll(".draggableCorner").call (drag);

		//menu
		var menu = this.wrapper.append("div").attr("class", "settings_menu");
		var buttonData = ["Data", "Appearance", "Custom config"]
		buttonData.forEach(function(b){
			var b_id = b.replace(" ", "_").toLowerCase();
			menu.append("button")
				.attr("class", "settingsTab btn btn-1a")
				.attr("data-tab", b_id)
				.text(b)
			;
		});

		var mainDiv = this.wrapper.append("div").attr("id", "settings_main");

		//data ToDo: change to more BBlike data handling
		var dataTab = mainDiv.append("div").attr("class", "settings-tab").attr("id", "settings_data");

		var dataForm = dataTab.append("form").attr("id", "settingsForm").attr("method", "post");

		var dataFlexColumn = dataForm.append("div").attr("class", "flex-column");

		var peptideLabel = dataFlexColumn.append("label").attr("class", "flex-container").text("Peptide Sequence: ")
		this.peptideViewEl = peptideLabel.append('div').attr('class', 'flex-grow').append("input")
			.attr("type", "text")
			.attr("required", "")
			.attr("autofocus", "")
			.attr("placeholder", "Peptide Sequence1[;Peptide Sequence2]")
			.attr("name", "peps")
		;
		this.pepInputView = new PepInputView({model: this.model, el: this.peptideViewEl[0] });

		var dataFlexRow = dataFlexColumn.append("div").attr("class", "flex-row");

		var leftDiv = dataFlexRow.append("div").attr("class", "settingsDataLeft");
		this.peaklist = leftDiv.append("textarea")
			.attr("required", "")
			.attr("id", "settingsPeaklist")
			.attr("type", "text")
			.attr("placeholder", "Peak List [m/z intensity]")
			.attr("name", "peaklist")
			.attr("class", "form-control")
		;

		var rightDiv = dataFlexRow.append("div").attr("class", "settingsDataRight");

		this.crossLinkerModMassWrapper = rightDiv.append("label").attr("class", "flex-container").text("Cross-linker mod mass: ");

		this.crossLinkerModMass = this.crossLinkerModMassWrapper.append('div').attr('class', 'flex-grow')
			.append("input").attr("placeholder", "CL mod mass").attr("autocomplete", "off").attr("name", "clModMass").attr("required", "").attr("type", "text")
		;

		this.precursorZ = rightDiv.append("label").attr("class", "flex-container").text("Precursor charge state: ").append('div').attr('class', 'flex-grow')
			.append("input").attr("type", "number").attr("placeholder", "Charge").attr("autocomplete", "off").attr("name", "preCharge").attr("min", "1").attr("required", "")
		;

		var ionSelector = rightDiv.append("label").attr("class", "flex-container").text("Fragment Ions: ")
			.append("div").attr("class", "mulitSelect_dropdown flex-grow")
		;
		ionSelector.append("input")
			.attr("type", "text")
			.attr("class", "btn-drop")
			.attr("id", "ionSelection")
			.attr("readonly", "")
		;
		var ionSelectorDropdown = ionSelector.append("div").attr("class", "mulitSelect_dropdown-content mutliSelect").append("ul").attr("id", 'ionList');
		var ionOptions = [
			{value: "peptide", text: "Peptide ion"},
			{value: "a", text: "A Ion"},
			{value: "b", text: "B Ion"},
			{value: "c", text: "C Ion"},
			{value: "x", text: "X Ion"},
			{value: "y", text: "Y Ion"},
			{value: "z", text: "Z Ion"},
		];
		d3.select("#ionList").selectAll("li").data(ionOptions)
			.enter()
			.append("li").append("label").text(function(d) { return d.text; })
			.append("input")
				.attr("class", "ionSelectChkbox")
				.attr("type", "checkbox")
				.attr("name", "ions[]")
				.attr("id", function(d) { return d.text.replace(" ", ""); })
				.attr("value", function(d) { return d.value; })

		;

		var toleranceWrapper = rightDiv.append("label").attr("class", "flex-container").text("MS2 tolerance: ");
		this.toleranceValue = toleranceWrapper.append('div').attr('class', 'flex-grow').append("input")
			.attr("type", "number")
			.attr("placeholder", "Error tolerance")
			.attr("autocomplete", "off")
			.attr("name", "ms2Tol")
			.attr("min", "0")
			.attr("step", "0.1")
			.attr("required", "")
		;
		this.toleranceUnit = toleranceWrapper.append("select")
			.attr("name", "tolUnit")
			.attr("required", "")
			.attr("style", "width: 100px; margin-left: 10px;")
			.attr("class", "form-control")
		;
		this.toleranceUnit.append("option").attr("value", "ppm").text("ppm");
		this.toleranceUnit.append("option").attr("value", "Da").text("Da");


		//modTable
		var modTableWrapper = dataForm.append("div").attr("class", "form-control dataTables_wrapper").attr("id", "modificationTable_wrapperOuter");
		var modTable = modTableWrapper.append("table").attr("id", "modificationTable").attr("style", "width: 100%");
		this.initializeModTable();

		//end modTable
		var dataBottom = dataForm.append("div").attr("class", "settings-bottom");

		var applyBtn = dataBottom.append("input").attr("class", "btn btn-1 btn-1a network-control").attr("value", "Apply").attr("id", "settingsDataApply").attr("type", "submit");
		var cancelBtn = dataBottom.append("input").attr("class", "btn btn-1 btn-1a network-control settingsCancel").attr("value", "Cancel").attr("id", "settingsCancel").attr("type", "button");

		//appearance
		var appearanceTab = mainDiv.append("div")
			.attr("class", "settings-tab")
			.attr("id", "settings_appearance")
			.style("display", "none")
		;

		var colorSchemeSelector = appearanceTab.append("label").attr("class", "btn").text("Color scheme: ")
			.append("select").attr("id", 'colorSelector').attr("class", 'form-control')
		;
		var colOptions = [
			{value: "RdBu", text: "Red & Blue"},
			{value: "BrBG", text: "Brown & Teal"},
			{value: "PiYG", text: "Pink & Green"},
			{value: "PRGn", text: "Purple & Green"},
			{value: "PuOr", text: "Orange & Purple"},
		];

		d3.select("#colorSelector").selectAll("option").data(colOptions)
			.enter()
			.append("option")
			.attr ("value", function(d) { return d.value; })
			.text (function(d) { return d.text; })
		;

		var highlightColorSelector = appearanceTab.append("label").attr("class", "btn").text("Highlight Color: ")
			.append("input").attr("class", "jscolor").attr("id", "highlightColor").attr("value", "#FFFF00").attr("type", "text")
		;
		jscolor.installByClassName("jscolor");

		var lossyChkBx = appearanceTab.append("label").attr("class", "btn").text("Show neutral loss labels")
			.append("input").attr("type", "checkbox").attr("id", "lossyChkBx")
		;

		this.decimals = appearanceTab.append("label").attr("class", "btn").text("Number of decimals to display: ")
			.append("input").attr("type", "number").attr("id", "settingsDecimals").attr("min", "1").attr("max", "10").attr("autocomplete", "off")
		;


        //custom config
		var customConfigTab = mainDiv.append("div").attr("class", "settings-tab").attr("id", "settings_custom_config").style("display", "none");

		var customConfigInput = customConfigTab.append("textarea").attr("id", "settingsCustomCfg-input").attr("class", "form-control");
		var customConfigBottom = customConfigTab.append("div").attr("class", "settings-bottom");
		var customConfigSubmit = customConfigBottom.append("input").attr("class", "btn btn-1 btn-1a network-control").attr("value", "Apply").attr("id", "settingsCustomCfgApply").attr("type", "submit");


		d3.select(this.el).selectAll("label")
			.classed ("label", true)
		;

		d3.select(this.el).selectAll("input[type=text]")
			.classed ("form-control", true)
		;
		d3.select(this.el).selectAll("input[type=number]")
			.classed ("form-control", true)
		;
		d3.select(this.el).selectAll("input[type=textarea]")
			.classed ("form-control", true)
		;

	},

	changeDecimals: function(){
		var model = this.model.otherModel; //apply changes directly for now
		model.showDecimals = parseInt(this.decimals[0][0].value);
		model.trigger('change'); //necessary for PrecursorInfoView update
	},

	applyCustomCfg: function(){
		var json = this.model.get("JSONrequest");
		json['annotation']['custom'] = "LOWRESOLUTION:false\n";	//ToDo: temp fix until new xiAnnotator version is released
		json['annotation']['custom'] += $("#settingsCustomCfg-input").val().split("\n");

		this.model.otherModel.request_annotation(json);
	},

	toggleView: function(){
		$(this.el).toggle();
		this.modTable.draw();
	},

	applyData: function(e){

		e.preventDefault();

		var form = e.currentTarget;
		if(!this.checkInputsForValidity(form))
			return false;

		var self = this;
		var formData = new FormData($(form)[0]);
		$('#settingsForm').hide();
		var spinner = new Spinner({scale: 5}).spin (d3.select("#settings_main").node());

		$.ajax({
			url: self.model.baseDir+"php/formToJson.php",
			type: 'POST',
			data: formData,
			async: false,
			cache: false,
			contentType: false,
			processData: false,
			success: function (response) {
				var json = JSON.parse(response);
				json['annotation']['custom'] = "LOWRESOLUTION:false\n";	//ToDo: temp fix until new xiAnnotator version is released
				self.model.otherModel.request_annotation(json);
				spinner.stop();
				$('#settingsForm').show();
			}
		});

		this.model.saveUserModificationsToCookie();
		return false;

		//window.SpectrumModel.request_annotation(window.SettingsSpectrumModel.JSONdata);
	},

	checkInputsForValidity: function(formData){

		var invalidChars = function(input, unknownCharPattern){
			var match = input.match(unknownCharPattern);
			if (match){
				console.log(match);
				return match;
			}
			return false;
		}
		//peptideStr
		if (invalidChars(formData['peps'].value, /([^GALMFWKQESPVICYHRNDTa-z;#0-9(.)]+)/))
			return false

		//peakList
		if (invalidChars(formData['peaklist'].value, /([^0-9\.\s]+)/))
			return false
		//clModMass
		if (invalidChars(formData['clModMass'].value, /([^0-9\.]+)/))
			return false
		//precursor charge state
		if (invalidChars(formData['preCharge'].value, /([^0-9]+)/))
			return false
		//ms2Tolerance
		if (invalidChars(formData['ms2Tol'].value, /([^0-9\.]+)/))
			return false


		return true;

	},

	initializeModTable: function(){
		var self = this;
		var modTableVars = {
			"scrollY": '130px',
			"scrollCollapse": true,
			"paging":   false,
			"ordering": false,
			"info":     false,
			"searching":false,
			"processing": true,
			"serverSide": true,
			"ajax": self.model.baseDir + "php/convertModsToJSON.php?peps=",
			"columns": [
				{ "title": "Mod-Input", "data": "id" },
				{ "title": "Modification", "className": "dt-center" },
				{ "title": "Mass", "className": "dt-center" },
				{ "title": "Specificity", "data": "aminoAcid", "className": "dt-center" },
			],

			"columnDefs": [
				{
					"render": function ( data, type, row, meta ) {
						return '<input class="form-control" id="modName_'+meta.row+'" title="modification code" name="mods[]" readonly type="text" value='+data+'>';
					},
					"class": "invisible",
					"targets": 0,
				},
				{
					"render": function ( data, type, row, meta ) {
						return row['id']+'<i class="fa fa-undo resetMod" title="reset modification to default" aria-hidden="true"></i></span>';
					},
					"targets": 1,
				},
				{
					"render": function ( data, type, row, meta ) {
						data = 0;
						var found = false;
						var rowNode = self.modTable.rows( meta.row ).nodes().to$();
						for (var i = 0; i < self.model.userModifications.length; i++) {
							if(self.model.userModifications[i].id == row.id){
								data = self.model.userModifications[i].mass;
								found = true;
								displayModified(rowNode);
							}
						}
						if (!found){
							for (var i = 0; i < self.model.knownModifications['modifications'].length; i++) {
								if(self.model.knownModifications['modifications'][i].id == row.id)
									data = self.model.knownModifications['modifications'][i].mass;
							}
						}
						return '<input class="form-control" id="modMass_'+meta.row+'" row="'+meta.row+'" title="modification mass" name="modMasses[]" type="number" min=0 step=0.0001 required value='+data+' autocomplete=off>';
					},
					"targets": 2,
				},
				{
					"render": function ( data, type, row, meta ) {
						for (var i = 0; i < self.model.userModifications.length; i++) {
							if(self.model.userModifications[i].id == row.id){
								data = self.model.userModifications[i].aminoAcids;
								var found = true;
							}
						}
						if (!found){
							for (var i = 0; i < self.model.knownModifications['modifications'].length; i++) {
								if(self.model.knownModifications['modifications'][i].id == row.id){
									data = data.split(",");
									data = _.union(data, self.model.knownModifications['modifications'][i].aminoAcids);
									data.sort();
									data = data.join("");

								}
							}
						}
						data = data.split(",").join("");
						return '<input class="form-control" id="modSpec_'+meta.row+'" row="'+meta.row+'" title="amino acids that can be modified" name="modSpecificities[]" type="text" required value='+data+' autocomplete=off>'
					},
					"targets": 3,
				}
	            ]
	    };

	    this.modTable = $('#modificationTable').DataTable( modTableVars );


	    //ToDo: change to BB event handling
		$('#modificationTable').on('input', 'input', function() {

			var row = this.getAttribute("row");
			var modName = $('#modName_'+row).val();
			var modMass = parseFloat($('#modMass_'+row).val());
			var modSpec = $('#modSpec_'+row).val();

			var mod = {'id': modName, 'mass': modMass, 'aminoAcids': modSpec};

			self.model.updateUserModifications(mod, false);
			displayModified($(this).closest("tr"));

		 });

		var displayModified = function (row){
			row.addClass('userModified');
			row.find(".resetMod").css("visibility", "visible");
		}

		$('#modificationTable').on('click', '.resetMod', function() {
			var modId = $(this).parent()[0].innerText;
			self.model.delUserModification(modId, false);
			self.modTable.ajax.reload();
		});


	},

	render: function() {

		this.pepInputView.render();
		this.modTable.ajax.url( this.model.baseDir + "php/convertModsToJSON.php?peps="+encodeURIComponent(this.model.pepStrsMods.join(";"))).load();
		//ions
		this.model.JSONdata.annotation.ions.forEach(function(ion){
			$('#'+ion.type).attr('checked', true);
		});
		var ionSelectionArr = new Array();
		$('.ionSelectChkbox:checkbox:checked').each(function(){
		    ionSelectionArr.push($(this).val());
		});
		$('#ionSelection').val(ionSelectionArr.join(", "));

		this.peaklist[0][0].value = this.model.peaksToMGF();
		this.precursorZ[0][0].value  = this.model.JSONdata.annotation.precursorCharge;
		this.toleranceValue[0][0].value  = parseInt(this.model.JSONdata.annotation.fragementTolerance);
		this.toleranceUnit[0][0].value = this.model.JSONdata.annotation.fragementTolerance.split(" ")[1];
		this.crossLinkerModMass[0][0].value = this.model.JSONdata.annotation['cross-linker'].modMass;
		this.decimals[0][0].value = this.model.showDecimals;

		if(this.model.isLinear)
			$(this.crossLinkerModMassWrapper[0][0]).hide();
		else
			$(this.crossLinkerModMassWrapper[0][0]).show();
	},

	cancel: function(){
		$(this.wrapper[0]).hide();
		document.getElementById('highlightColor').jscolor.hide();
		//reset the model by copying the original model
		var model_copy = jQuery.extend({}, this.model.otherModel);
		model_copy.otherModel = this.model.otherModel;
		this.model = model_copy;
		this.render();
		// window.SettingsView.render();

	},

	changeTab: function(e) {
		var activeTab = $(e.currentTarget).data('tab');
		$('.settings-tab').hide();
		$('#settings_'+activeTab).show();
	},

	updateJScolor: function(event) {
		var color = '#' + event.originalEvent.srcElement.value;
		//for now change color of model directly
		//ToDo: Maybe change this also to apply/cancel and/or put in reset to default values
		this.model.otherModel.changeHighlightColor( color );
	},

	updateIons: function(event){

		var ionSelectionArr = new Array();
		$('.ionSelectChkbox:checkbox:checked').each(function(){
			ionSelectionArr.push($(this).val());
		});

		if (ionSelectionArr.length == 0)
			$('#ionSelection').val("Select ions...");
		else
			$('#ionSelection').val(ionSelectionArr.join(", "));

	},

	showLossy: function(e) {
		var model = this.model.otherModel; //apply changes directly for now
		var $target = $(e.target);
        var selected = $target .is(':checked');
		model.lossyShown = selected;
		model.trigger("changed:lossyShown");
	},

	changeColorScheme: function(e){
		var model = this.model.otherModel; //apply changes directly for now
		model.changeColorScheme(e.target.value);
	},
});
