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
//		TableWrapperView.js

var TableWrapperView = Backbone.View.extend({

	events : {
		'click .closeTable' : 'hideView',
		'click .nav-tabs a[data-toggle=tab]' : 'changeTab',
	},

	initialize: function(viewOptions) {

		//ToDo: need to check if initId is alternative explanation or not
		var defaultOptions = {
			initId: false,
		};
		this.options = _.extend(defaultOptions, viewOptions);

		this.listenTo(CLMSUI.vent, 'updateAltCount', this.updateNav);
		this.listenTo(CLMSUI.vent, 'toggleTableView', this.toggleView);

		var d3el = d3.select(this.el);

		var closeButton = d3el.append("i")
			.attr("class", "fa fa-times-circle closeTable")
			.attr("id", "specListClose")
		;

		var navBar = d3el.append("ul").attr("class", "nav nav-tabs");

		navBar.append("li").attr("class", "active").append("a")
			.attr("data-toggle", "tab")
			.attr("href", "#tab-specListTable")
			.text("Spectra List")
		;
		navBar.append("li").attr("id", "nav-altListTable").append("a")
			.attr("data-toggle", "tab")
			.attr("href", "#tab-altListTable")
			.text('Alternative Explanations').append("span").attr("id", "altExpNum")
		;

		var contentDiv = d3el.append("div")
			.attr("class", "tab-content")
		;

		var specListTab = contentDiv.append("div")
			.attr("class", "tab-pane fade in active")
			.attr("id", "tab-specListTable")
		;
		var specListWrapper = specListTab.append("div")
			.attr("class", "listWrapper")
			.attr("id", "specListWrapper")
		;
		this.specListTable = new specListTableView({
			model: this.model,
			el:"#specListWrapper",
			wrapper: this,
			initId: this.options.initId,
		});

		var altListTab = contentDiv.append("div")
			.attr("class", "tab-pane fade in")
			.attr("id", "tab-altListTable")
		;
		var altListWrapper = altListTab.append("div")
			.attr("class", "listWrapper")
			.attr("id", "altListWrapper")
		;
		this.altListTable = new altListTableView({
			model: this.model,
			el:"#altListWrapper",
			wrapper: this,
		});
	},

	hideView: function(){
		$(this.el).hide();
		window.trigger('resize');
	},

	toggleView: function(){
		$(this.el).toggle();
		window.trigger('resize');
	},

	changeTab: function(e){
		if ($(e.target).parent().hasClass("disabled")) {
			e.preventDefault();
			return false;
		}

		var target_href = e.target.getAttribute('href');

		if(target_href == '#tab-altListTable'){
			this.altListTable.render();
		}
		$('.tab-pane').hide();
		$(target_href).show();
		window.trigger('resize');
	},

	updateNav: function(alt_count){
		if(alt_count > 1){
			$('#nav-altListTable').removeClass('disabled');
			$('#altExpNum').text("(" + (parseInt(alt_count)-1) + ")");
			// window.TableWrapper.altListTable.DataTable.ajax.url( "/php/getAltList.php?id=" + mzid + "&db=" + window.SpectrumModel.get('database')+"&tmp=" + window.SpectrumModel.get('tmpDB')).load();
		}
		else{
			$('#altExpNum').text("(0)");
			$('#nav-altListTable').addClass('disabled');
		}
	}

});
