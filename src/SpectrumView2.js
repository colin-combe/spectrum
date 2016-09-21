var SpectrumView = Backbone.View.extend({

    events : {
        'click #reset' : 'resetZoom',
        'click #lossyChkBx': 'showLossy',
        'submit #setrange' : 'setrange',
        'click #clearHighlights' : 'clearHighlights',
        'change #colorSelector': 'changeColorScheme',
        'click #measuringTool': 'measuringTool',
        'click #moveLabels': 'moveLabels',
		'click #downloadSVG': 'downloadSVG',
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
		this.listenTo(this.model, 'changed:Highlights', this.updateHighlights);
		//this.listenTo(this.model, 'destroy', this.remove);
	},

	render: function() {
		this.graph.clear();
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

	clearHighlights: function(){
		this.model.sticky.length = 0;
		this.model.highlights.length = 0;
		this.updateHighlights();
	},

	changeColorScheme: function(e){
		this.model.changeColorScheme(e.target.value);
	},

	updateColors: function(){
		this.graph.updateColors();
	},

	updateHighlights: function(){

		var peaks = this.graph.points;

		for(p = 0; p < peaks.length; p++){
			var highlightFragments = _.intersection(peaks[p].fragments, this.model.highlights);
			if(highlightFragments.length != 0){
				peaks[p].highlight(true, highlightFragments);
			}
			else if(peaks[p].fragments.length > 0)
				peaks[p].highlight(false);
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
        console.log ("peaks", peaks);

		if (selected){
			for(var p = 0; p < peaks.length; p++){
				if(peaks[p].labels.length){ // MJG added .length
					//for(l = 0; l < peaks[p].labels.length; l++){ // MJG
						peaks[p].labels/*[l]*/
                            .call(peaks[p].labelDrag)
				            .style("cursor", "pointer")
                        ;
					//}			
				}
			}
		}
		else{
			for(var p = 0; p < peaks.length; p++){
				if(peaks[p].labels.length){ // MJG added .length
					//for(l = 0; l < peaks[p].labels.length; l++){ // MJG
						peaks[p].labels/*[l]*/
                            .on(".drag", null)
				            .style("cursor", "default")
                        ;
					//}
				}
			}			
		}
	},
	downloadSVG:function(){
            var svgSel = d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);
            download (svgXML, 'application/svg', "view.svg");
    },
});
