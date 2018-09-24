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
//		PrecursorInfoView.js
var PrecursorInfoView = Backbone.View.extend({

	events : {
		'click .toggle' : 'expandToggle',
	},

	initialize: function(viewOptions) {

		var defaultOptions = {
			invert: false,
			hidden: false,
		};

		this.options = _.extend(defaultOptions, viewOptions);

		this.listenTo(xiSPEC.vent, 'butterflyToggle', this.butterflyToggle);
		this.listenTo(xiSPEC.vent, 'resize:spectrum', this.render);
		this.listenTo(window, 'resize', _.debounce(this.render));
		this.expand = true;

		// this.svg = d3.select(this.el.getElementsByTagName("svg")[0]); //xispec_Svg
		this.svg = d3.select(this.el);

		//create
		this.wrapper = this.svg.append('text')
			.attr("class", "precursorInfo")
			.attr("x", 10)
			.attr("y", 13)
			.attr("font-size", 12);




		this.listenTo(this.model, 'change', this.render);
	},

	clear: function(){
		this.wrapper.selectAll("*").remove();
	},

	render: function() {
		this.clear();

		if(this.options.hidden)
			return;

		this.toggle = this.wrapper.append('tspan')
			.text("[-]")
			.style("cursor", "pointer")
			.attr("font-family", "monospace")
			.attr("class", "toggle");

		this.wrapper.append('tspan')
			.text("  Precursor: ")
			.style("cursor", "pointer")
			.attr("class", "toggle");

		this.content = this.wrapper.append('tspan')
			.style("cursor", "default");


		if(this.options.invert){
			var $el = $(this.el)
			var parentWidth = $el.width();
			var parentHeight = $el.height();
			var top = this.model.isLinear ? parentHeight - 65 : parentHeight - 115;
			this.wrapper.attr("transform", "translate(0," + top + ")");
		}

		var precursor = this.model.precursor;
		var content = "";

		var dataArr = [];
		if (precursor.intensity !== undefined && precursor.intensity != -1)
			dataArr.push("Intensity=" + precursor.intensity);
		if (precursor.matchMz !== undefined && precursor.matchMz != -1)
			dataArr.push("match m/z=" + precursor.matchMz.toFixed(this.model.showDecimals));
		if(precursor.calcMz !== undefined)
			dataArr.push("calc m/z=" + precursor.calcMz.toFixed(this.model.showDecimals));
		if (precursor.charge !== undefined)
			dataArr.push("z=" + precursor.charge);
		if (precursor.error !== undefined)
			dataArr.push("error=" + precursor.error.tolerance.toFixed(this.model.showDecimals) + ' ' + precursor.error.unit);

		content += dataArr.join("; ");
		this.content.text(content);

	},

	expandToggle: function(){
		this.expand = !this.expand;
		if(this.options.hidden)
			return;
		newOpacity = this.expand ? 1 : 0;

		this.content.style("opacity", newOpacity);
		if (!this.expand)
			this.toggle.text("[+]")
		else
			this.toggle.text("[-]")
	},

	butterflyToggle: function(toggle){
		// this.graph.options.butterfly = toggle;
		if(this.options.invert){
			this.options.hidden = !toggle;
			this.render();
		}
		this.render();
	},

});
