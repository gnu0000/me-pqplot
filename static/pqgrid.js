//
// pqview.js 
// Implements the graph for pqplot
//
// Craig Fitzgerald



//////////////////////////////////////////////////////////////////////////////
// class representing the "grid"
// "grid" meaning the area inside the axes
//
function PQGrid(gridsize, options) {
   var self = this;

   this.Init = function(gridsize, options) {
      self.options = $.extend({
         displayText      : 1,
         logQuanPlot      : 1,
         dataReady        : self.Reset,
      }, options || {});

      self.gridsize = new Point(gridsize); // is this paranoia?
      self.min      = new Point(0,0);      // minimum plottable data point
      self.max      = new Point(0,0);      // maximum plottable data point
      self.range    = new Point(0,0);      // range of plottable data points
      self.scale    = new Point(1,1);      // mapping of data values to grid values
      self.data     = new PQData(self.options);
   };

   this.CreatePoints = function() {
      var biddata = self.data.biddata;
      for (var i=0; i<biddata.length; i++) {
         var bid = biddata[i];
         bid.gPoint = new Point(0,0);
      }
   };

   // called via PQData callback when data needs to be recalculated
   //
   this.Reset = function(dataWasRefetched) {
      if (dataWasRefetched) self.CreatePoints();
      self.CalcMetrics();
      if (self.options.gridReady) self.options.gridReady(dataWasRefetched);
   };

   this.CalcMetrics = function() {
      self.CalcDataExtents();         // min and max values in the dataset
      self.CalcMarkers();
      self.AdjustDataExtents();       // min and max values adjusted to show markers
      self.CalcGridMapping();         // calc conversion factor from data values to grid pixels
      self.CalcGridPoints();          // calc grid positions for the bids
      
      if (self.options.debug) self.DebugStats();
   };


   // calcs min/max for quanty and price data
   // 
   // self.min       -
   // self.max       -
   // self.actualMin -
   // self.actualMax -
   //
   this.CalcDataExtents = function() { // min and max values in the dataset
      var point = new Point(0,0);
      self.min.Set(Number.MAX_VALUE,Number.MAX_VALUE);
      self.max.Set(-Number.MAX_VALUE,-Number.MAX_VALUE);
      
      var biddata = self.data.biddata;
      for (var i=0; i<biddata.length; i++) {
         var bid = biddata[i];
         if (bid.exclude == 1) continue;
         point.Set(bid.quantity - 0, bid.bidprice - 0);
         self.min.Min(point);
         self.max.Max(point);
      }
      self.actualMin = new Point(self.min);
      self.actualMax = new Point(self.max);
      };

   this.CalcMarkers = function() {
      if (self.options.logQuanPlot != 1) self.CalcReasonableMarkers();
      if (self.options.logQuanPlot == 1) self.CalcReasonableLogMarkers();
   };

   
   // calculate the values to display along an axis for linear quantity and price
   //
   this.CalcReasonableMarkers = function() {
      self.xMarkers = self.ReasonableMarkers(self.min.x, self.max.x, 5 );
      self.yMarkers = self.ReasonableMarkers(self.min.y, self.max.y, 10);
   };

      
   // calculate the values to display along an axis for log quantity and linear price
   //
   this.CalcReasonableLogMarkers = function() {
      self.xMarkers = self.ReasonableLogMarkers(self.min.x, self.max.x);
      self.yMarkers = self.ReasonableMarkers   (self.min.y, self.max.y, 10);
   };

       
   //  This was a major pain
   //  todo: does not consider minVal! assumes zero
   //        
   this.ReasonableMarkers = function (minVal, maxVal, maxCount) {
       if (!maxVal) return [];

      // this requires beer to fully understand...
      var lg = Math._Log10(maxVal);
      var  a = Math.floor(lg) + (lg > 0 ? -1 : -2);
      var  b = maxVal * Math.Exp10(-a);
      var  c = Math.floor(b + 0.001);
      var  d = (c + 1) * Math.Exp10(a);
      var  e = (c + 1)/maxCount;
      var  f = (e < 1 ? Math.floor(e * 10) / 10 : Math.floor(e + 0.5));
      f = (f>6?10:(f>4?5:(f>2.75?3:(f>2.25?2.5:(f>1.5?2:(f>1?1:f))))));
      
      var markers = [];
      markers.push(0);
      
      for (i=0.0; i < d; )
         {
         i = i + f * Math.Exp10 (a);
         markers.push(i);
         }

//   self.TestReasonableMarkers(4, 56);
//   self.TestReasonableMarkers(400, 420);

      return markers;
   };


//   this.TestReasonableMarkers = function(min, max) {
//       var al = Math._Log10(min);
//       var ab = Math.floor(al);
//       var aca = Exp10(ab);
//       var ac = min / aca;
//
//       var zz=2;
//
////       var a0 = _dig(min, 0);
////      var a1 = _dig(min, 1);
////
////       var b0 =
////       var b1 =
//   };

function round(num,pre) {
    if( !pre) pre = 0;
    var pow = Math.pow(10,pre);
    return Math.round(num*pre)/pre;
}   

   

   // creates markers for a log-based axis.  
   // And you'd think working with logs would be more work than linear ...
   //   
   this.ReasonableLogMarkers = function(min, max) {
      var a = Math._Log10(max);
      var b = Math.floor(a + 1);
     
      var markers = [];
      for (var i = 0; i <= b; i++) {
         markers.push(Math.Exp10(i));
      }
      return markers;
   };
    
   
   // the min and max data values of the view are adjusted to show markers
   // and gives us a bit or a border around the data
   //
   this.AdjustDataExtents = function() {
      if (!self.xMarkers && !self.yMarkers) return;
      
      self.min.Set(self.xMarkers[0], self.yMarkers[0]);
      self.max.Set(self.xMarkers[self.xMarkers.length-1], self.yMarkers[self.yMarkers.length-1]);
      self.range.Set(self.max).UnOffset(self.min);
      if (self.options.logQuanPlot)
         self.range.x = self.xMarkers[self.xMarkers.length-1];
//      self.logxMin   = (self.options.logQuanPlot ? Math._Log10(self.xMin)     : 0);
//      self.logxMax   = (self.options.logQuanPlot ? Math._Log10(self.xMax)     : 0);
//      self.logxRange = (self.options.logQuanPlot ? self.logxMax-self.logxMin : 0);
   };
   

   // calc conversion factor from data values to grid pixels   
   //
   this.CalcGridMapping = function() {
      var divx    = (self.options.logQuanPlot ? Math._Log10(self.range.x) : self.range.x) || 0.001;
      self.scale.Set(self.gridsize).UnScale(divx, self.range.y);
   };
   
   this.CalcGridPoints = function() {          // calc grid positions for the bids
      var biddata = self.data.biddata;
      for (var i=0; i<biddata.length; i++) {
         var bid = biddata[i];
         bid.gPoint.Set(bid.quantity-0, bid.bidprice-0);
         self.PointFromData(bid.gPoint);
      };
   };
   
   this.PointFromData = function(point) { // actually a static
      if (self.options.logQuanPlot) point.x = Math._Log10(point.x);
      point.Scale(self.scale);
      point.FlipYAxis(self.gridsize.y);
      return point;
   };
   
   this.PointToData = function(point) { // actually a static
      point.FlipYAxis(self.gridsize.y);
      point.UnScale(self.scale);
      if (self.options.logQuanPlot) point.x = Math.Exp10(point.x);
      return point;
   };
   
   this.DataMin = function() {
      return self.PointfromData(self.data.min);
   };
   
   this.DataMax = function() {
      return self.PointfromData(self.data.max);
   };
   
   
   this.DebugDataToGridDetails = function(index) {
      var bid = self.data.biddata[index];
      var point = new Point(bid.quantity-0, bid.bidprice-0);
      self.Message("---Data to grid details---");
      self.Message("x : "+point.x+" , log10x: " + Math._Log10(point.x));
      self.Message("xscale : "+self.scale.x);
      self.Message("result x:"+ Math._Log10(point.x) * self.scale.x);
      
      self.Message("y : "+point.y);
      self.Message("yscale : "+self.scale.y+" , scaled y:"+ point.y * self.scale.y);
      self.Message("ygridsize : "+ self.gridsize.y);
      
      var z = self.gridsize.y - point.y * self.scale.y; // flip axis
      self.Message("result y: " + z);
      
//      self.Message("A0: " + (self.gridsize.y)                           );
//      self.Message("A1: " + (point.y * self.scale.y)                    );
//      self.Message("A2: " + (self.gridsize.y) - (1)                     );
//      self.Message("A3: " + self.gridsize.y - 0                          );
//      self.Message("A4: " + self.gridsize.y - 1                          );
//      self.Message("A5: " + 1 - self.gridsize.y                          );
//      self.Message("A6: " + (1) - (point.y * self.scale.y)              );
//      self.Message("A7: " + (self.gridsize.y) + (point.y * self.scale.y));
//      self.Message("A8: " + (self.gridsize.y) - (point.y * self.scale.y));
//      self.Message("B:  " + point.y * self.scale.y                      );
//      self.Message("C:  " + self.gridsize.y                             );
//      self.Message("D:  " + self.gridsize.y - point.y * self.scale.y    );
   };
   
   
   this.DebugStats = function() {
      self.Message("--------Grid--------------"                    );
      self.Message("self.gridsize   : " + self.gridsize.AsString() );
      self.Message("self.min        : " + self.min.AsString()      );
      self.Message("self.max        : " + self.max.AsString()      );
      self.Message("self.actualMin  : " + self.actualMin.AsString()      );
      self.Message("self.actualMax  : " + self.actualMax.AsString()      );
      self.Message("self.range      : " + self.range.AsString()    );
      self.Message("self.scale      : " + self.scale.AsString()    );
   };                                                                1
   
   this.Message = function(text) {
      var div = $("#messagediv pre");
      div.append(text+"<br/>");
      setTimeout(function () {div[0].scrollTop = 9999999}, 10);
   };
   
   
   
   this.Init(gridsize, options);
};


