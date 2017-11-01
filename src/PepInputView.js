var PepInputView = Backbone.View.extend({

  events: {
    "input":  "contentChanged",
    //"keyup": "contentChanged",
  },

  initialize: function() {
    this.listenTo(this.model, 'changed:data', this.render);
  },

  contentChanged: function(e) {
    var pepStrs = this.el.value.split(";");

    var peptides = [];
    var linkSites = [];

    for (var i = 0; i < pepStrs.length; i++) {

      var pep_noMods = pepStrs[i].replace(/([^#0-9])([().a-z0-9]+)/g, '$1');

      //linkSite
      var cl_re = /#([0-9]+)?/g;
      while ((match = cl_re.exec(pep_noMods)) != null) {
        var clIndex = match[1] === undefined ? 0 : match[1];
        var linkSite = {'id': clIndex, 'peptideId': i, 'linkSite': match.index-1};
        linkSites.push(linkSite);
      }

      //peptide sequence
      var pepAAseq = pepStrs[i].replace(/[^A-Z]/g, "");
      var peptide = {'sequence': []};
      for (var j = 0; j < pepAAseq.length; j++) {
        peptide['sequence'].push({'aminoAcid': pepAAseq[j], 'Modification': ''});
      }

      //add in mods
      var pep_noCL = pepStrs[i].replace(cl_re, "");
      var modifications = [];
      var mod_re = /([().a-z0-9]+)/g;
      var offset = 1;
      while ((match = mod_re.exec(pep_noCL)) != null) {
        peptide['sequence'][match.index-offset].Modification = match[1];
        offset += match[1].length;
      }

      peptides.push(peptide);
    }



    //update model with input data

    if (this.model.JSONdata !== undefined && this.model.JSONdata !== null){
      this.model.JSONdata.Peptides = peptides;
      this.model.JSONdata.LinkSite = linkSites;
      this.model.trigger("change:JSONdata");
    }
    else
      this.model.set({JSONdata: {'Peptides': peptides, 'LinkSite': linkSites} });

    //ToDo: this should be handled inside the model
    this.model.calcPrecursorMass();

  },

  render: function() {

    if(this.model.peptides === undefined || this.model.JSONdata === null)
      return;

    var pepStrsArr = [];
    for(i=0; i < this.model.peptides.length; i++){
      pepStrsArr[i] = "";
      for(j = 0; j < this.model.peptides[i].sequence.length; j++){
        pepStrsArr[i] += this.model.peptides[i].sequence[j].aminoAcid+this.model.peptides[i].sequence[j].Modification;
        //insert the # for the crosslink
        if (this.model.JSONdata.LinkSite.length > 0){
          for (var k = 0; k < this.model.JSONdata.LinkSite.length; k++) {
            if (this.model.JSONdata.LinkSite[k].peptideId == i && this.model.JSONdata.LinkSite[k].linkSite == j)
              pepStrsArr[i] += "#" // + (this.model.JSONdata.LinkSite[k].id+1); only needed for multiple cls
          }
        }
      }
    }

    var pepsStr = pepStrsArr.join(";");
    if (this.el.value != pepsStr)
      this.el.value = pepsStr;
  },


});
