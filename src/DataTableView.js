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
//		DataTableView.js

var DataTableView = Backbone.View.extend({

	events : {

	},

	initialize: function() {

	},

	render: function(){
		this.DataTable.draw();
	},

	// changeDisplayScore: function(index){
	// 	console.log('Table - changeDisplayScore: '+index);
	// },

	userScoreChange: function(e){
		CLMSUI.vent.trigger('scoreChange', $(e.target).attr('data-score'));
	},

	hideEmptyColumns: function(e) {
		if (this.DataTable === undefined)
			return false;
		if(this.isEmpty(this.DataTable.columns('pep2:name').data()[0])){
			this.DataTable.columns('pep2:name').visible( false );
			this.DataTable.columns('linkpos1:name').visible( false );
			this.DataTable.columns('linkpos2:name').visible( false );
			this.DataTable.columns('protein2:name').visible( false );
		}
		else{
			this.DataTable.columns('pep2:name').visible( true);
			this.DataTable.columns('linkpos1:name').visible( true );
			this.DataTable.columns('linkpos2:name').visible( true );
			this.DataTable.columns('protein2:name').visible( true );
		}
	},

	isEmpty: function(arr) {
		for(var i=0; i<arr.length; i++) {
			if(arr[i] !== "") return false;
		}
		return true;
	},

});
