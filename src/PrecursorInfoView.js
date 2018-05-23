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
		'click .toggle' : 'toggle',
	  },

	initialize: function() {

		this.show = true;

		var self = this;

		this.svg = d3.select(this.el.getElementsByTagName("svg")[0]); //spectrumSVG

		//create
		this.wrapper = this.svg.append('text')
			.attr("class", "precursorInfo")
			.attr("x", 10)
			.attr("y", 13)
			.attr("font-size", 12);

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


		this.listenTo(this.model, 'change', this.render);
	},

	render: function() {
		var data = this.model.annotationData;
		var content = "";

		var dataArr = [];
		if (data.precursorIntensity !== undefined && data.precursorIntensity != -1)
			dataArr.push("Intensity=" + data.precursorIntensity);
		if (data.precursorMZ !== undefined && data.precursorMZ != -1)
			dataArr.push("m/z=" + data.precursorMZ.toFixed(this.model.showDecimals));
		// if(this.model.calcMass !== undefined)
		// 	dataArr.push("calc m/z=" + (this.model.calcMass/data.precursorCharge+1.007276).toFixed(this.model.showDecimals));
		if (data.precursorCharge !== undefined)
			dataArr.push("z=" + data.precursorCharge);
		if (data.precursorError !== undefined && data.precursorError != "")
			dataArr.push("error=" + data.precursorError);
		if (data.psmID !== undefined)
			dataArr.push("psmID=" + data.psmID);

		content += dataArr.join("; ");
		this.content.text(content);

	},

	toggle: function(){
		var active   = this.show ? false : true,
		  newOpacity = active ? 1 : 0;
		// Hide or show the elements
		this.content.style("opacity", newOpacity);
		if (!active)
			this.toggle.text("[+]")
		else
			this.toggle.text("[-]")
		// Update whether or not the elements are active
		this.show = active;
	}
});
