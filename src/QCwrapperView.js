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
//		QCwrapperView.js

// ToDo: move Splitting to parent view?

var QCwrapperView = Backbone.View.extend({

	events : {
		'click .toggle' : 'toggleView',
		'click #minQC' : 'minView',
		'click #dockQC' : 'showView',
		'click .dockRight' : 'dockRight',
		'click .dockBottom' : 'dockBottom',
		'change .plotSelectChkbox': 'updatePlots',
		'click #downloadQCSVG': 'downloadQCSVG',
	},

	initialize: function(viewOptions) {

		var defaultOptions = {
			splitIds: ['#spectrumMainPlotDiv', '#QCdiv'],
			showOnStartUp: true,
		};
		this.options = _.extend(defaultOptions, viewOptions);

		this.plotSplit = Split(this.options.splitIds, {
			sizes: [75, 25],
			minSize: [250, 150],
			gutterSize: 5,
			direction: 'vertical',
			onDragEnd: function(){ CLMSUI.vent.trigger('resize:spectrum'); }
		});

		this.dock = 'bottom';
		// this.isVisible = true;

		this.headerDiv = d3.select(this.el.getElementsByClassName("subViewHeader")[0]);
		this.contentDiv = d3.select(this.el.getElementsByClassName("subViewContent")[0]);

		this.title = this.headerDiv.append("span")
			.text('Quality control plots')
		;

		this.controlsDiv = this.headerDiv.append("span");

		var plotSelector = this.controlsDiv.append("div").attr("class", "multiSelect_dropdown")
		;
		plotSelector.append("span")
			.attr("type", "text")
			.attr("class", "btn btn-1a")
			.html('<i class="fa fa-chevron-down" aria-hidden="true"></i>')
		;
		var plotSelectorDropdown = plotSelector.append("div").attr("class", "multiSelect_dropdown-content mutliSelect");
		var plotSelectorList = plotSelectorDropdown.append("ul");
		var plotOptions = [
			{value: "int", text: "Intensity"},
			{value: "mz", text: "m/z"},
		];
		plotSelectorList.selectAll("li").data(plotOptions)
			.enter()
			.append("li").append("label")
			.append("input")
				.attr("class", "plotSelectChkbox")
				.attr("type", "checkbox")
				.attr("checked", "checked")
				.attr("id", function(d) { return d.text; })
				.attr("value", function(d) { return d.value; })
		;
		plotSelectorList.selectAll("label").data(plotOptions)
			.append('span')
			.text(function(d) { return d.text; })
		;

		var downloadButton = this.controlsDiv.append('i')
		 	.attr("class", "btn btn-1a btn-topNav fa fa-download pointer")
			.attr("aria-hidden", "true")
			.attr("id", "downloadQCSVG")
			.attr("title", "download SVG(s)")
		;

		var rightControls = this.controlsDiv.append('div')
			.attr('class', 'rightControls')
		;

		// this.dockLeftBtn = rightControls.append('i')
		// 	.attr('class', 'fa fa-window-maximize pointer dockLeft')
		// 	.attr('aria-hidden', 'true')
		// 	.attr('title', 'dock to left')
		// ;
		this.dockBottomBtn = rightControls.append('i')
			.attr('class', 'fa fa-window-maximize pointer dockBottom')
			.attr('aria-hidden', 'true')
			.attr('style', 'display:none;')
			.attr('title', 'dock to bottom')
		;
		this.dockRightBtn = rightControls.append('i')
			.attr('class', 'fa fa-window-maximize pointer dockRight')
			.attr('aria-hidden', 'true')
			.attr('title', 'dock to right')
		;

		// <i class="fa fa-window-maximize" aria-hidden="true"></i>

		this.dockQCbtn = this.headerDiv.append('i')
			.attr('class', 'fa fa-angle-double-up pointer minMax')
			.attr('id', 'dockQC')
			.attr('aria-hidden', 'true')
			.attr('title', 'show QC plots')
			.attr('style', 'display: none;')
		;
		this.minQCbtn = this.headerDiv.append('i')
			.attr('class', 'fa fa-angle-double-down pointer minMax')
			.attr('id', 'minQC')
			.attr('aria-hidden', 'true')
			.attr('title', 'hide QC plots')
		;

		if(!this.options.showOnStartUp)
			this.minView();
	},

	downloadQCSVG: function(){
		CLMSUI.vent.trigger('downloadQCSVG');
	},

	splitHorizontal: function(){
		try{
			this.plotSplit.destroy();
		}
		catch(err){}
		this.plotSplit = Split(this.options.splitIds, {
			sizes: [75, 25],
			minSize: [500, 220],
			gutterSize: 4,
			direction: 'horizontal',
			onDragEnd: function(){ CLMSUI.vent.trigger('resize:spectrum'); }
		});
	},

	splitVertical: function(){
		try{
			this.plotSplit.destroy();
		}
		catch(err){}
		this.plotSplit = Split(this.options.splitIds, {
			sizes: [75, 25],
			minSize: [250, 200],
			gutterSize: 4,
			direction: 'vertical',
			onDragEnd: function(){ CLMSUI.vent.trigger('resize:spectrum'); }
		});
	},

	showView: function(){
		// this.isVisible = true;
		CLMSUI.vent.trigger('show:QC', true);
		$(this.controlsDiv[0]).show();
		$(this.dockQCbtn[0]).hide();
		$(this.minQCbtn[0]).show();
		$(this.contentDiv[0]).show();
		if (this.dock == 'left' || this.dock == 'right'){
			this.splitHorizontal();
			if (this.dock == 'left')
				this.dockLeft();
			else if (this.dock == 'right')
				this.dockRight();
		}
		else{
			this.splitVertical();
		}
		CLMSUI.vent.trigger('resize:spectrum');
	},

	minView: function(){
		// this.isVisible = false;
		CLMSUI.vent.trigger('show:QC', false);
		if(this.dock == 'left' || this.dock == 'right'){
			$(this.el).parent().css('flex-direction', 'column');
			$(this.el).removeClass('right');
			$(this.el).removeClass('left');
			$(this.contentDiv[0]).css('flex-direction', 'row');
		}
		$(this.controlsDiv[0]).hide();
		$(this.dockQCbtn[0]).show();
		$(this.minQCbtn[0]).hide();
		$(this.contentDiv[0]).hide();
		if(this.plotSplit)
			this.plotSplit.destroy();
		CLMSUI.vent.trigger('resize:spectrum');
	},

	dockSide: function(){
		this.title.text("QC");
		$(this.el).parent().css('flex-direction', 'row');
		$(this.contentDiv[0]).css('flex-direction', 'column');
		this.splitHorizontal();
		CLMSUI.vent.trigger('resize:spectrum');
	},

// dockLeft breaks splitting
// 	dockLeft: function(){
// 		if (this.dock === 'left')
// 			return;
// 		this.dock = 'left';
// 		this.dockSide();
// 		$(this.el).addClass('left');
// 		$(this.el).removeClass('right');
// // 		$('#spectrumMainPlotDiv').css('order', 5);
//
//  		$('.gutter-horizontal').css('order', -1);
// 	},

	dockRight: function(){
		this.dock = 'right';
		$(this.dockBottomBtn[0]).show();
		$(this.dockRightBtn[0]).hide();
		this.dockSide();
		$(this.el).addClass('right');
		$(this.el).removeClass('left');
// 		$('.gutter-horizontal').css('order', 0);
	},

	dockBottom: function(){
		$(this.dockBottomBtn[0]).hide();
		$(this.dockRightBtn[0]).show();
		this.title.text("Quality control plots");
		this.dock = 'bottom';
		$(this.el).parent().css('flex-direction', 'column');
		$(this.el).removeClass('left');
		$(this.el).removeClass('right');
		$(this.contentDiv[0]).css('flex-direction', 'row');
		this.splitVertical();
		CLMSUI.vent.trigger('resize:spectrum');
	},

	updatePlots: function(e){
		var plotId = $(e.target).attr('id');
		var checked = $(e.target).is('checked');
		CLMSUI.vent.trigger('QCPlotToggle', plotId);
		CLMSUI.vent.trigger('resize:spectrum');
	}

});
