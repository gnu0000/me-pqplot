//
// plot.js - this is a prototype if a js implementation of pqplot
//
//  usage:
//    var plot = new PQPlotter($("canvas", {datasource: "/plotdata", colorPlotPoint: "red"})
//
//    This first parameter is an html5 canvas dom element, the second 
//    parameter is a set of options that override the default. As a minimum
//    you'll want to specify the datasorce option to get your data
//
//    the script then cals the url given by the 'datasource' option, and it
//    expects to get back a json array of objects that must include
//    'quantity' and 'price' attributes, (and soon 'rank')
//
// Craig Fitzgerald
//

// test implementation
//  you probably wouldn't use it this way unless you didnt need to provide any options  
//
$(function() {
   var url = document.location.href;
   var qparam = url.match(/\?(.*)$/);
   var itemnumber = qparam && qparam.length > 1 ? qparam[1] : "2121-7425022"; 

   var options = {database:   "iadot",
                  datasource: "/fetchdata",
                  itemnumber: itemnumber};
   $('.js_pqplotter').each(function(){new PQPlotter(this, options)});
});

        
// This class implements a Price/quantity plot using html5 canvas
//
function PQPlotter(canvasElement, options) {
   var self = this;
   
   this.Init = function(canvasElement, options) {
      self.InitAttributes(canvasElement, options);
      self.InitEvents();
      self.InitState();
   };
   
   this.InitAttributes = function(canvasElement, options) {
      self.view = new PQView(canvasElement, options);
   };

   // development events
   this.InitEvents = function() {
      $(document).keydown(self.DebugKeys);
   };

   this.InitState = function() {
      self.DebugKeyLegend();
   };

   this.DebugKeys = function(e) {
      if (e.keyCode == 73)                  self.DebugKeyLegend();                        // i    
      if (e.keyCode == 67)                  $("#messagediv pre").empty();                 // c    
      if (e.keyCode == 77)                  self.DebugMetrics();                          // m    
      if (e.keyCode > 47 && e.keyCode < 59) self.view.DataPointDebugInfo(e.keyCode - 48); // 0-9  
      if (e.keyCode == 71)                  self.view.grid.DebugDataToGridDetails(5);     // gi   
      
      //alert("key was " + e.keyCode);   
   };

   this.DebugKeyLegend = function() {
      self.Message("i  : this help                   "); 
      self.Message("c  : clear display               "); 
      self.Message("m  : metric info                 ");
      self.Message("0-9: info about datapoint n      "); 
      self.Message("g  : datapoint->gridpoint details"); 
   };
   
   this.DebugMetrics = function() {
      self.view.grid.data.DebugStats();
      self.view.grid.DebugStats();
      self.view.DebugStats();
   };
   
      
   this.Message = function(text) {
      var div = $("#messagediv pre");
      div.append(text+"<br/>");
      setTimeout(function () {div[0].scrollTop = 9999999}, 10);
   };

   this.Init(canvasElement, options);
};
   
