//
// pqview.js 
// Implements the view for pqplot
//
// Craig Fitzgerald


// constants
//
var SCALE_FACTOR = 1.50;


var DEFAULT_COLOR_PROGRESSION = [
      "hsl(0,  0%, 0%)",
//      "hsl(0,  66%,50%)",
//      "hsl(23, 66%,50%)",
//      "hsl(39, 66%,50%)",
//      "hsl(50, 66%,50%)",
//      "hsl(108,60%,50%)",
//      "hsl(126,60%,50%)",
//      "hsl(144,50%,50%)",
//      "hsl(164,40%,50%)",
//      "hsl(186,30%,50%)",
//      "hsl(186,10%,50%)"
        "hsl(108,99%,88%)",
        "hsl(108,89%,70%)",
        "hsl(108,79%,65%)",
        "hsl(108,69%,60%)",
        "hsl(108,59%,55%)",
        "hsl(108,49%,50%)",
        "hsl(108,39%,45%)",
        "hsl(108,29%,40%)",
        "hsl(108,19%,35%)",
        "hsl(108,09%,30%)",
    ];


//////////////////////////////////////////////////////////////////////////////
// class representing the "view"
// "view" meaning the labels, axes, and the portion of the grid that is visible
//
function PQView(canvasElement, options) {
   var self = this;
   
   this.Init = function(canvasElement, options) {
      self.InitAttributes(canvasElement, options);
      self.InitEvents();
      self.InitState();
   };

   this.InitAttributes = function(canvasElement, options) {
      self.options = $.extend({
         logQuanPlot             : 1                  ,
         itemInfoSource          : "/iteminfo"        ,
         vendorInfoSource        : "/vendorinfo"      ,
         leftMargin              : 90                 ,
         rightMargin             : 25                 ,  
         topMargin               : 10                 ,  
         bottomMargin            : 45                 ,  
         pointSize               : 7                  ,
         halfYLabel              : 4                  ,   
         displayText             : 1                  ,   
         showBids                : 1                  ,   
         showConfidenceInterval  : 1                  ,   
         showBestFitCurve        : 1                  ,   
         showCrosshair           : 1                  ,   
         calcBestFitQuality      : 1                  ,   
         imageMapExtraText       : ""                 ,
         colorTemplateFrame      : "black"            ,
         colorTemplateGridline   : "#444"             ,
         colorTemplateGridline2  : "#999"             ,
         colorBackgroundTop      : "#FFF"             ,
         colorBackgroundBottom   : "#85C585"          ,
         colorType               : "none"             ,
         colorPlotPoint          : "#black"           , // no longer used ?
         colorPointProgression   : DEFAULT_COLOR_PROGRESSION,
         colorConfidenceInterval : "rgb(192,192,222)" ,
         colorCrosshairs         : "#777"             ,
         colorCrosshairInfo      : "#476"             ,
         colorBestFitCurve       : "black"            ,   
         fontMarkers             : "bold 12px Arial"  ,
         fontLabels              : "bold 16px Arial"  ,
         fontCrosshairInfo       : "bold 12px Arial"  ,
         posColorLegend          : {x:10, y:-10}      , 
         posCrosshairInfo        : {x:103, y:32}      , 
         xMarkerAdjust           : {x: 0 , y: 8}      ,
         yMarkerAdjust           : {x:-2 , y: 3}      ,
         xLabelAdjust            : {x: 0 , y:-8}      ,
         yLabelAdjust            : {x: 8 , y: 0}      ,
         dataFetchStart          : function(){self.DisplayWorkingMessage(1)},
         dataFetchComplete       : function(){self.DisplayWorkingMessage(0)},
         dataFetchError          : self.DisplayAjaxError,
         gridReady               : self.Reset         ,
         tickmarkSize            : 4                  ,
         debug                   : 1
      }, options || {});

      self.canvas0          = canvasElement;
      self.canvas1          = $("#canvas1")[0];
      self.popup            = $("#bidderinfo");

      self.canvasSize       = new Point(self.canvas0.clientWidth, self.canvas0.clientHeight);
      self.viewportStartPos = new Point(self.options.leftMargin, self.options.topMargin);
      self.viewportEndPos   = new Point(self.canvasSize.x - self.options.rightMargin, 
                                        self.canvasSize.y - self.options.bottomMargin);
      self.viewportSize     = new Point(self.viewportEndPos.x - self.viewportStartPos.x + 1,
                                        self.viewportEndPos.y - self.viewportStartPos.y + 1);
      self.viewportCenter   = self.viewportSize.Copy().Scale(0.5,0.5).Offset(self.viewportStartPos);
      self.offset           = new Point(0,0);
      self.scale            = 1;
      self.panning          = 0;

      self.panMinPos        = new Point(0,0);
      self.panMaxPos        = new Point(0,0);
      self.maxPan           = new Point(0,0);

      self.itemDescription = "";
      self.itemUnit        = "";
      
      self.surface0         = new PQSurface(canvasElement, {hasgradient:1});
      self.surface1         = new PQSurface($("#canvas1").get(0), {});
      self.grid             = new PQGrid(self.viewportSize, self.options);
   };   

   this.InitEvents = function() {
      $(self.canvas1).mousedown (self.Mousedown );
      $(self.canvas1).mouseup   (self.Mouseup   );
      $(self.canvas1).mousewheel(self.Mousewheel);
      $(document).mousewheel   (self.CatchMousewheel); // someone please explain mousewheel bubbling!
      $(self.canvas1).mousemove(self.DebugMousemove);// debug      
      $(self.canvas1).mousemove(self.Mousemove);
      $(self.canvas1).mouseleave(self.Mouseleave);
      $(self.canvas1).click(self.Click);
      $("#rankrange").change(self.RankFilterChange);
      $("#agerange").change(self.AgeFilterChange);
      $("#outlierreset input").click(self.ResetOutliers);
      $('input[name=colorby]').click(self.ColorChange);
      $('input[name=colorby]').click(self.ColorChange);
      $('input[name=addvendorfilter]').click(self.AddVendorFilter);
      $('.vendorfilters').delegate('input[name=addvendoridinput]', 'focus' , self.VendorSelectFocus)
                         .delegate('input[name=addvendoridinput]', 'blur'  , self.VendorSelectBlur)
                         .delegate('input[name=addvendoridinput]', 'change', self.VendorSelectChange)
                         .delegate('input[name=addvendoridinput]', 'keyup' , self.VendorSelectKeyup);
   };

   this.InitState = function() {
      self.GetItemInfo();
      self.GetVendorInfo();
      self.DrawBackground();
   };

   this.GridRefreshCallback = function() {
      self.Reset();
   };

   this.Reset = function(dataWasRefetched) {
      self.CalcMetrics();
      self.ShowCounts();
      self.UpdateOutlierCount();
      if (dataWasRefetched) self.SetFilters();

      self.Display();
   };

   this.CalcMetrics = function() {
      if (self.options.debug) self.DebugStats();
   // possibly nothing
   };

   this.ShowCounts = function() {
      $("#activebids"  ).text(Number.FormatNumber(self.grid.data.activeCount, 0))
      $("#inactivebids").text(Number.FormatNumber(self.grid.data.excludedCount, 0));
   };

   this.UpdateOutlierCount = function() {
      var outlierCount = self.grid.data.GetOutlierCount();
      $('#outlierinfo').text(outlierCount + " outliers");
   };


   this.Display = function() {
      self.DrawBackground();
      if (self.options.showConfidenceInterval) self.PlotConfidenceInterval (); 
      self.DisplayTemplate();
      if (self.options.showBestFitCurve      ) self.PlotBestFitCurve ();
      if (self.options.showBids              ) self.PlotBids ();
      if (self.options.showBids              ) self.ShowColorLegend ();
   };
   
   this.DisplayTemplate = function() {
      self.surface0.SetFont (self.options.fontMarkers);
      self.DrawYAxis();
      self.DrawXAxis();
      if (self.options.displayText) self.DrawAxisText ();
   };

   this.DrawBackground = function() {
      self.surface0.Clear();
   };

   this.DrawYAxis = function() {
      var markerSet = self.GetMarkerSet(1,0);

      for (var i=0; i < markerSet.length; i++) {
         self.DrawYAxisLine(markerSet[i]);
      }
//      self.VLine(0, self.viewportStartPos.x, self.viewportStartPos.y, self.viewportEndPos.y, 3, self.options.colorTemplateFrame);
      self.surface0.VLine(self.viewportStartPos.x, self.viewportStartPos.y, self.viewportEndPos.y, 3, self.options.colorTemplateFrame);
   };

   this.DrawXAxis = function() {
      var markerSet = self.GetMarkerSet(0,self.options.logQuanPlot);

      for (var i=0; i < markerSet.length; i++) {
         self.DrawXAxisLine(markerSet[i]);
      }
      self.surface0.HLine(self.viewportEndPos.y, self.viewportStartPos.x, self.viewportEndPos.x, 3, self.options.colorTemplateFrame);
   };

   this.DrawYAxisLine = function(marker){
      var tickLeft  = self.viewportStartPos.x - self.options.tickmarkSize;
      var tickRight = tickLeft + self.options.tickmarkSize;
      var markerPoint = new Point(0,marker.val);
      self.PointFromData(markerPoint);

      if (markerPoint.y < self.viewportStartPos.y) return 0;
      if (markerPoint.y > self.viewportEndPos.y  ) return 0;

      var lineColor = marker.color ? self.options.colorTemplateGridline2 : self.options.colorTemplateGridline;
      var textColor = marker.color ? self.options.colorTemplateGridline2 : self.options.colorTemplateFrame   ;

      // tickmark & guiderule         
      self.surface0.HLine(markerPoint.y, tickLeft, tickRight, 1, self.options.colorTemplateFrame);
      self.surface0.HLine(markerPoint.y, tickRight+1, self.viewportEndPos.x, 1, lineColor);

      var label      = "$" + Number.FormatNumber (marker.val, 2);
      var labelwidth = self.surface0.TextWidth(label);
      var labelPos   = new Point(tickLeft - labelwidth, markerPoint.y).Offset(self.options.yMarkerAdjust);
      self.surface0.Text(label, labelPos, textColor);
   };

   this.DrawXAxisLine = function(marker){
      var tickTop     = self.viewportEndPos.y + 1;
      var tickBottom  = self.viewportEndPos.y + 1 + self.options.tickmarkSize;
      var markerPoint = new Point(marker.val, 0);
      self.PointFromData(markerPoint);
      
      if (markerPoint.x < self.viewportStartPos.x)   return 0;
      if (markerPoint.x > self.viewportEndPos.x+1.5) return 0;

      var lineColor = marker.color ? self.options.colorTemplateGridline2 : self.options.colorTemplateGridline;
      var textColor = marker.color ? self.options.colorTemplateGridline2 : self.options.colorTemplateFrame   ;

      // tickmark & guiderule         
      self.surface0.VLine(markerPoint.x, tickTop, tickBottom, 1, self.options.colorTemplateFrame);
      self.surface0.VLine(markerPoint.x, self.viewportStartPos.y, tickTop-1, 1, lineColor);

      var Decimals   = (marker.val < 10 ? (marker.val < 1 ? 4 : 2) : 0);
      var label      = Number.FormatNumber (marker.val, Decimals);
      var labelWidth = self.surface0.TextWidth(label);
      var labelPos   = new Point(markerPoint.x - labelWidth/2, tickBottom).Offset(self.options.xMarkerAdjust);
      self.surface0.Text(label, labelPos, textColor);
   };


   this.GetMarkerSet = function(set, log){
      var extras = self.scale < 2   ? 0  :
                   self.scale < 5   ? 2  :
                   self.scale < 10  ? 4  :
                   self.scale < 20  ? 10 :
                   self.scale < 50  ? 20 :
                   self.scale < 100 ? 40 : 
                                      100;
      var markers = set ? self.grid.yMarkers : self.grid.xMarkers;
      if(log == 0)
         return self.MakeInterpolatedMarkerSet(markers, extras);
      else
         return self.MakeLogarithmicInterpolatedMarkerSet(markers, extras);
   };

   this.MakeInterpolatedMarkerSet = function(markers, extras){
      var newMarkers = [];
      for (var mIndex=0, nIndex=0; mIndex+1 < markers.length; mIndex++) {
         var smallMarker=markers[mIndex];
         var largeMarker=markers[mIndex+1];
         newMarkers[nIndex++] = {val:smallMarker, color:0};
         for (var i=1; i<extras; i++){
            var val = smallMarker + (largeMarker - smallMarker)/extras*i;
            newMarkers[nIndex++] = {val:val, color:1};
         }
      }
      newMarkers.push({val:markers[markers.length-1], color:0});
      return newMarkers;
   };

   this.MakeLogarithmicInterpolatedMarkerSet = function(markers, extras){
      var newMarkers = [];
      for (var mIndex=0, nIndex=0; mIndex+1 < markers.length; mIndex++) {
         var smallMarker=markers[mIndex];
         var largeMarker=markers[mIndex+1];
         newMarkers[nIndex++] = {val:smallMarker, color:0};
         for (var i=1; i<extras; i++){
            var val = Math.Exp10(Math._Log10(smallMarker) + (Math._Log10(largeMarker) - Math._Log10(smallMarker))/extras*i);
            newMarkers[nIndex++] = {val:val, color:1};
         }
      }
      newMarkers.push({val:markers[markers.length-1], color:0});
      return newMarkers;
   };

   
   // part of DisplayTemplate()
   //   
   this.DrawAxisText = function() {
      var xLabel  = "Item Quantity (" + self.itemUnit + ")";
      var yLabel  = "Unit Price";
      
      self.surface0.SetFont (self.options.fontLabels);
      
      var xLabelWidth = self.surface0.TextWidth(xLabel);
      var yLabelWidth = self.surface0.TextWidth(yLabel);
      
      var labelPos = new Point(self.viewportCenter.x-xLabelWidth/2, self.canvasSize.y).Offset(self.options.xLabelAdjust)
      self.surface0.Text(xLabel,labelPos, self.options.colorTemplateFrame);
      
      self.surface0.Rotate(Math.PI/2);
      labelPos.Set(self.viewportCenter.y-yLabelWidth/2, 0).Offset(self.options.yLabelAdjust.y,-self.options.yLabelAdjust.x);
      self.surface0.Text(yLabel, labelPos, self.options.colorTemplateFrame);
      self.surface0.Rotate(0 - Math.PI/2);
   };
   
   // part of DisplayData()
   // build a canvas polygon representing the 90% confidence interval around the best-fit curve
   // the resolution of the polygon is zoom dependent, so it belongs to the view
   //
   this.PlotConfidenceInterval = function() {
      if (!self.grid.data.IsRegressionOK())
         return;
      
      // gather up the points defining the confidence area      
      var intervals = [];
      var dataPoint = new Point(0,0)
      for (var xView = self.viewportStartPos.x; xView < self.viewportEndPos.x; xView+= 4) {
         dataPoint.Set(xView,self.viewportCenter.y);
         self.PointToData(dataPoint);
         var interval = self.grid.data.RegressionInterval(dataPoint.x);

         interval.min = self.ConstrainDomain(self.PointFromData(interval.min));
         interval.max = self.ConstrainDomain(self.PointFromData(interval.max));
         intervals.push(interval);
      };         
               
      // build a polygon using the confidence interval data points
      self.surface0.SetColor(self.options.colorConfidenceInterval);
      self.surface0.BeginPath();
      self.surface0.MoveTo(intervals[0].min);
      for (var i=0; i<intervals.length; i++)
         self.surface0.LineTo(intervals[i].max);
      for (var i=intervals.length-1; i>-1; i--)
         self.surface0.LineTo(intervals[i].min);
         self.surface0.Fill();
   };         

   
   // constrain the view point to the current view   
   //
   this.ConstrainDomain = function (point) {
      return point.Max(self.viewportStartPos).Min(self.viewportEndPos);
   };         


   // part of DisplayData()
   //   
   this.PlotBestFitCurve = function() {

      if (!self.grid.data.IsRegressionOK())
         return;

      var oldPoint  = new Point(0,0);
      var dataPoint = new Point(0,0)

      self.surface0.SetColor(self.options.colorBestFitCurve);
      
      for (var xView = self.viewportStartPos.x; xView < self.viewportEndPos.x; xView+= 4) {
         dataPoint.Set(xView,0);
         self.PointToData(dataPoint);

         dataPoint.y = self.grid.data.RegressionPrice(dataPoint.x);

         self.ConstrainDomain(self.PointFromData(dataPoint));

         if (oldPoint.x) self.surface0.Line(oldPoint, dataPoint, 1);
         oldPoint.Set(dataPoint);
      }
   };
   
   
   // part of DisplayData()
   //
   //
   this.PlotBids = function() {
      self.surface0.SetColor(self.options.colorPointProgression[0]);
      self.surface0.SetStrokeColor(self.options.colorPointProgression[0]);

      var biddata = self.grid.data.biddata;

      if (!biddata || !self.grid.data.activeCount)
         return self.ShowNoBids();

      var point = new Point(0,0);
      var currentColorIndex = -1;
      for (var i=0; i<biddata.length; i++) {
         var bid = biddata[i];
         if (bid.exclude > 0) continue;
         point.Set(bid.gPoint);
         point = self.PointFromGrid(point);  // a copy?
         if (!self.IsWithinViewport(point)) continue;

         if (currentColorIndex != bid.colorIndex){
            self.surface0.SetColor(self.options.colorPointProgression[bid.colorIndex]);
            currentColorIndex = bid.colorIndex;
         }
         self.surface0.Circle(point, self.options.pointSize/2);
      };
   };

   this.ShowColorLegend = function(){
      if (self.options.colorType != "rank" && self.options.colorType != "age") return;
      var point = new Point(self.options.posColorLegend).RelativeTo(self.canvasSize);
      for (var i=1; i<self.options.colorPointProgression.length; i++) {
         self.surface0.SetColor(self.options.colorPointProgression[i]);
         self.surface0.Circle(point, self.options.pointSize/2);
         point.Offset(self.options.pointSize * 2, 0);
      }
   };
   
   this.IsWithinViewport = function(point) {
      if (point.x < self.viewportStartPos.x) return 0;
      if (point.y < self.viewportStartPos.y) return 0;
      if (point.x > self.viewportEndPos.x  ) return 0;
      if (point.y > self.viewportEndPos.y  ) return 0;
      return 1; 
   };

   this.ShowNoBids = function() {
      var diag = Math.sqrt(self.viewportSize.x * self.viewportSize.x +
                           self.viewportSize.y * self.viewportSize.y);
      var angle = Math.atan(self.viewportSize.y/self.viewportSize.x);

      var pts = Math.floor(diag/8);
      var font = "bold "+pts+"px Arial";
      self.surface0.SetFont (font);
      var tpos = new Point(self.viewportStartPos).Offset(0,self.viewportSize.y);
      self.surface0.Translate(tpos);
      self.surface0.Rotate(0 - angle);
      self.surface0.Text("No Data", new Point(diag/4,pts/3), self.options.colorBackgroundBottom);
      self.surface0.Rotate(0 + angle);
      self.surface0.Translate(tpos.Negate());
   };

   
   this.Mousedown = function(pos) {
      var point = new Point(pos.offsetX, pos.offsetY);
      pos.preventDefault() ;

      self.panMinPos = new Point(0,0)
      self.panMaxPos = self.PointFromGrid(self.grid.gridsize.Copy()).UnOffset(self.viewportSize);

      // setup for move
      self.mousedownPos       = point.Copy();
      self.mouseDelta         = new Point(0,0);
      self.mouseInitialOffset = new Point(self.offset);
      $(self.canvas1).mousemove(self.CapturedMousemove);
      $(window).mouseup(self.WindowMouseUpCatch);
      self.ClearCrosshairs();
      self.panning = 1;
   };


   this.WindowMouseUpCatch = function(e){
      $(self.canvas1).off("mousemove", self.CapturedMousemove);
      $(window).off("mouseup", self.WindowMouseUpCatch);
      setTimeout(function(){self.panning = 0},10);
      e.preventDefault();
      e.stopPropagation();
   };
   
   this.Mouseup = function(event) {
      $(self.canvas1).off("mousemove", self.CapturedMousemove);
      $(window).off("mouseup", self.WindowMouseUpCatch);
      setTimeout(function(){self.panning = 0},10);
      event.preventDefault ();
      event.stopPropagation();
   };


   this.Mouseleave = function(event) {
      self.ClearCrosshairs();
   };

   
   this.DebugMousemove = function(event) {
      var point = new Point(event.offsetX, event.offsetY);
      $('#mousepos').html(point.AsString());
   };
   
   
   this.CapturedMousemove = function(event) {
      var point       = new Point(event.offsetX, event.offsetY);
      self.mouseDelta = self.mousedownPos.Copy().UnOffset(point);
      self.offset     = self.mouseInitialOffset.Copy().UnOffset(self.mouseDelta);
      self.offset.Min(0,0);
      self.offset.Max(self.maxPan);
      self.Display();
   };


   this.Mousemove = function(event) {
      var viewPoint = new Point(event.offsetX, event.offsetY);
      var dataPoint = self.PointToData(viewPoint.Copy());

      self.surface1.Clear();

      self.UpdateRegressionInfo(dataPoint);

      if (self.panning == 0)
         self.ShowBidsUnderMouse(viewPoint, dataPoint);
   };

   this.UpdateRegressionInfo = function(dataPoint) {

      if (!self.grid.data.IsRegressionOK())
         return;

      var regressionPoint = new Point(dataPoint.x, self.grid.data.RegressionPrice(dataPoint.x));
      var viewPoint = self.ConstrainDomain(self.PointFromData(regressionPoint.Copy()));
      if (self.panning == 0)
         self.PaintCrosshairs(viewPoint);
      self.UpdatePriceQuantity(regressionPoint); 
   };

   this.PaintCrosshairs = function(point) {
      if (self.panning == 1)
         return;
      if (!self.grid.data.IsRegressionOK())
         return;

      self.surface1.HLine(point.y, self.viewportStartPos.x, self.viewportEndPos.x, 1, self.options.colorCrosshairs);
      self.surface1.VLine(point.x, self.viewportStartPos.y, self.viewportEndPos.y, 1, self.options.colorCrosshairs);
   };

   this.ClearCrosshairs = function() {
      self.surface1.Clear();
   };


   this.UpdatePriceQuantity = function(dataPoint) {

      var pos = new Point(self.options.posCrosshairInfo);
      self.surface1.SetFont (self.options.fontCrosshairInfo);
      self.surface1.Text("Quantity:", pos             , self.options.colorCrosshairInfo);
      self.surface1.Text("Price:"   , pos.Offset(0,15), self.options.colorCrosshairInfo);
      self.surface1.Text(Number.FormatNumber(dataPoint.x,2),     pos.Offset(53,-15), self.options.colorCrosshairInfo);
      self.surface1.Text(Number.FormatNumber(dataPoint.y,2,"$"), pos.Offset(0,15)  , self.options.colorCrosshairInfo);
   };


   this.ShowBidsUnderMouse = function(viewPoint, dataPoint) {
      var bids = self.FindBidsUnderMouse(viewPoint);
      if (!bids.length){
          self.popup.hide();
          return;
      }
      var bid = self.grid.data.biddata[bids[0]];

      $("#vendornamelabel" ).text(bid.vendorname  );
      $("#lettingidlabel"  ).text(bid.lettingid   );
      $("#lettingdatelabel").text(bid.lettingdate.substring(0, 10));
      $("#contidlabel"     ).text(bid.contid      );
      $("#ranklabel"       ).text(bid.rank        );
      $("#callorderlabel"  ).text(bid.callorder   );
      $("#bidquantitylabel").text(Number.FormatNumber(bid.quantity, 2));
      $("#bidpricelabel"   ).text(Number.FormatNumber(bid.bidprice, 2, "$"));

      self.BidderInfoPopup(1,viewPoint);
   };


   this.BidderInfoPopup = function(show,pos) {
      var popup = $('#bidderinfo');
      if (!show){
         popup.hide();
         return;
         }
      var anchor = $(self.canvas0).offset();
      pos.Offset(anchor.left,anchor.top);
      pos.Offset(10,10);

      popup.css("left", pos.x);
      popup.css("top", pos.y);
      popup.show();
      return popup;
   };

   this.Click = function(event) {
      var viewPoint = new Point(event.offsetX, event.offsetY);

      if (!viewPoint.IsCloseTo(self.mousedownPos, 3))
         return; // no pop if we were panning

      var bids = self.FindBidsUnderMouse(viewPoint);
      if (!bids || !bids.length) 
         return;
      self.grid.data.MarkAsOutliers(bids);
      self.UpdateOutlierCount();
      self.PopBid(viewPoint,1);
   };

   this.PopBid = function(viewPoint) {
      if (arguments.length == 2)
         {
         self.animationTime = 100;
         self.popPoint      = viewPoint.Copy();
         self.startSize     = self.options.pointSize;
         self.endSize       = self.options.pointSize * 6;
         self.animateStart  = (new Date()).getTime();
         }
      var now         = (new Date()).getTime();
      var elapsed     = now - self.animateStart
      var percentDone = Math.min(elapsed/self.animationTime, 1.0);
      var size = self.startSize + (self.endSize - self.startSize) * percentDone;
      var alpha =(1-percentDone)*255;
      self.surface0.SetColor("rgba(40,8,60,"+alpha+")");
      self.surface0.Circle(self.popPoint, size/2);

      if (elapsed < self.animationTime)
         setTimeout(self.PopBid, Math.min(10,elapsed));
      else
         self.grid.data.Recalc(0);
   };
   
   this.ResetOutliers = function(point) {
      self.grid.data.ResetOutliers();
      self.grid.data.Recalc(0);
   };

   this.FindBidsUnderMouse = function(point) {
      var point0 = point.Copy().Offset(-self.options.pointSize/2,self.options.pointSize/2);
      var point1 = point.Copy().Offset(self.options.pointSize/2,-self.options.pointSize/2);
      self.PointToData(point0);
      self.PointToData(point1);
      return self.grid.data.BidsWithin(point0,point1);
   };

   this.Mousewheel = function(event, delta) {
      var point = new Point(event.offsetX, event.offsetY);
      //self.Message("wheel client["+event.clientX+","+event.clientY+"]"+" offset["+event.offsetX+","+event.offsetY+"]"+" Delta["+delta+"]");
      var newScale = self.scale * (delta > 0 ? SCALE_FACTOR : 1 / SCALE_FACTOR);
      var newScale = Math.max(newScale, 1);
      
      self.AnimateRescale(point, newScale, 1);
      event.stopPropagation();
      event.preventDefault();
   };
   
   this.AnimateRescale = function(point, scale) {
      if (arguments.length == 3)
         {
         self.animationTime = 150;
         self.startScale    = self.scale;
         self.endScale      = scale;
         self.animateStart  = (new Date()).getTime();
         self.scalePoint    = point;
         }
      var now         = (new Date()).getTime();
      var elapsed     = now - self.animateStart
      var percentDone = Math.min(elapsed/self.animationTime, 1.0);

      var intermediateScale = self.startScale + (self.endScale - self.startScale) * percentDone;

      self.Rescale(self.scalePoint, intermediateScale);

      if (elapsed < self.animationTime)
         setTimeout(self.AnimateRescale, Math.min(10,elapsed));
   };
   
   
   // change the scale of the viewport.
   // GridX, GridY define the point that doesn't move
   //
   this.Rescale = function(scalePoint, scale) {
   
      var phantomDataPoint = self.PointToData(scalePoint.Copy());
      self.scale = scale;
      self.maxPan.Set(self.viewportSize).Scale(1-self.scale,1-self.scale);

      var newScalePoint    = self.PointFromData(phantomDataPoint.Copy());
      
      self.offset.Offset(scalePoint).UnOffset(newScalePoint);
      self.offset.Min(0,0);
      self.offset.Max(self.maxPan);

      $('#zoomval').html(Math.floor(self.scale * 100)/100);
      
      self.Display();
   }
   
   this.CatchMousewheel = function(event, delta) {
      //self.Message("caught mousewheel");
      event.stopPropagation();
      event.preventDefault();
   }

   this.ItemIsLumpSum = function() {
      return 0; // todo
   };

   
   this.DisplayWorkingMessage = function(show) {
      
      // todo
   };

   this.DisplayAjaxError = function(xhr, error) {
      alert ("Ajax Error: " + error);
   };
   
   this.PointFromGrid = function(point) {
      point.Scale(self.scale,self.scale);
      point.Offset(self.offset);
      point.Offset(self.viewportStartPos);
      return point;
   };
   
   this.PointToGrid = function(point) {
      point.UnOffset(self.viewportStartPos);
      point.UnOffset(self.offset);
      point.UnScale(self.scale,self.scale);
      return point;
   };
   
   this.PointToData = function(point) {
      self.PointToGrid(point);
      return self.grid.PointToData(point);
   };

   this.PointFromData = function(point) { 
      self.grid.PointFromData(point);
      return self.PointFromGrid(point);
   };

   this.DebugStats = function() {
      self.Message("--------View--------------"                         );
      self.Message("self.canvasSize       : " + self.canvasSize.AsString()      );
      self.Message("self.viewportStartPos : " + self.viewportStartPos.AsString());
      self.Message("self.viewportEndPos   : " + self.viewportEndPos.AsString()  );
      self.Message("self.viewportSize     : " + self.viewportSize.AsString()    );
      self.Message("self.viewportCenter   : " + self.viewportCenter.AsString()  );
      self.Message("self.offset           : " + self.offset.AsString()          );     
      self.Message("self.scale            : " + self.scale                      );
      self.Message("self.panMinPos        : " + self.panMinPos.AsString()       );     
      self.Message("self.panMaxPos        : " + self.panMaxPos.AsString()       );     
   };
   
   
   this.DataPointDebugInfo = function(index) {
      var dp = self.grid.data.biddata[index]
      self.Message("DataPoint["+index+"]");
      self.Message("--Data:["+dp.quantity+","+dp.bidprice+"]");
      self.Message("--"+dp.gPoint.AsString("Grid"));
      var point = new Point(dp.gPoint);
      point = self.PointFromGrid(point);  // a copy?  wip ....
      self.Message("--"+dp.gPoint.AsString("View"));
      self.grid.DebugDataToGridDetails(index);
   };

   this.AgeFilterChange = function(event) {
      self.ShowAgeFilterInfo ();
      var val = $('#agerange').val();
      self.grid.data.SetAgeFilter(val);
   };

   this.ShowAgeFilterInfo = function() {
      var val = $('#agerange').val();
      var years = Math.floor(val / 12);
      var months= val % 12;
      var msg = years + " years, "+ months +" months or newer";
      $('#ageinfo').text(msg);
   };


   this.RankFilterChange = function(event) {
      self.ShowRankFilterInfo ();
      var val = $('#rankrange').val();
      if (val > 5) val = 1000;
      self.grid.data.SetRankFilter(val);
   };

   this.ShowRankFilterInfo = function() {
      var val = $('#rankrange').val();
      var msg = (val == 1 ? "Low bidder only"  :
                 val == 2 ? "2 lowest bidders" :  
                 val == 3 ? "3 lowest bidders" :  
                 val == 4 ? "4 lowest bidders" :  
                 val == 5 ? "5 lowest bidders" :  
                           "All bidders");
      $('#rankinfo').text(msg);
   };


   this.SetFilters = function(){
      $('#agerange').val(self.grid.data.GetMaxAge());
      $('#rankrange').val(self.grid.data.GetMaxRank());
      self.ShowRankFilterInfo();
      self.ShowAgeFilterInfo();

   };

   
   this.GetItemInfo = function(){
      var url = self.options.itemInfoSource + "?itemnumber=" + encodeURI(self.options.itemnumber);
      $.ajax({
         url:     url,
         success: function(data){self.SetItemInfo(data)} ,
         error:   function(){self.SetItemInfo()}  ,
      });
   };

   this.SetItemInfo = function(data){
      self.itemDescription      = (data ? data.description      : "(error getting description)");
      self.itemDescriptionArray = (data ? data.descriptionarray : []);
      self.itemUnit             = (data ? data.unit             : "(unit)");
      $('#title').html(self.options.itemnumber + " - " + self.itemDescription);

      if (data && self.itemDescriptionArray.length > 2){
         $('#title').mouseover(self.ShowAllDescriptions);
      }else{
         $('#title').off("mouseover", self.ShowAllDescriptions);
      }
   };

   this.GetVendorInfo = function(){
      var url = self.options.vendorInfoSource + "?itemnumber=" + encodeURI(self.options.itemnumber);
      $.ajax({
         url:     url,
         success: function(data){self.SetVendorInfo(data)} ,
         error:   function(){self.SetVendorInfo()}  ,
      });
   };

   this.SetVendorInfo = function(data){
      self.itemVendorArray = (data ? data.vendorarray : []);
//      debug;
   };


   this.ShowAllDescriptions = function() {
      var html = '<ul>';
      for (var i=0; i<self.itemDescriptionArray.length; i++) {
         html += '<li>' + self.itemDescriptionArray[i] + '</li>';
      }     
      html += '</ul>';
      $('#descriptionlist').html(html);
   };

   this.ColorChange = function(e) {
      var colorType = $('input[name=colorby]:checked').val();
      var ageRange    = self.grid.data.AgeRange(); //of active bids only
      var targetRange = new Point(1, self.options.colorPointProgression.length);
      var biddata = self.grid.data.biddata;

      for (var i=0; i<biddata.length; i++) {
         var bid = biddata[i];
         var index = (colorType == "rank" ? bid.rank :
                      colorType == "age"  ? self.InterpolateTo(bid.age, ageRange, targetRange) :
                                            0);
         bid.colorIndex = index;
      }
      self.options.colorType = colorType;
      self.Display();
   };

   this.InterpolateTo = function (val, valRange, targetRange, round){
      var scale = (targetRange.y-targetRange.x)/(valRange.y-valRange.x);
      var target = (val - valRange.x) * scale + targetRange.x;
      return Math.floor(target + 0.49);
   };

   this.AddVendorFilter = function() {
      $('#vendorfilter_template .vendorfilter').clone().insertAfter('#vendorfilterinsertmarker');
      $('.vendorfilters .vendorfilter').show();

   };


///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

   this.VendorSelectFocus  = function(e) {
      self.ShowVendorChoices(e.target, 1);
   };

   this.VendorSelectBlur   = function(e) {
      self.ShowVendorChoices(e.target, 0);
   };

   this.VendorSelectChange = function(e) {
      self.FilterVendorChoices(e.target);
   };

   this.VendorSelectKeyup  = function(e) {
     window.setTimeout(function () { self.FilterVendorChoices(e.target); }, 100);
   };

   this.ShowVendorChoices  = function(target, show) {
      if (show == 0) {
      $('#vendorchoices').hide();
      return;
      }
   var vc = self.GetVendorChoices(target);
   self.PositionDropdown(vc,target);
   vc.show();
   };


   this.PositionDropdown = function(div, anchor) {
      anchor = $(anchor);
      var pos = anchor.offset();
      div.css('position',     'absolute');
      div.css('top',     pos.top + anchor.height());
      div.css('top',     pos.top + anchor.height());
      div.css('left',    '20px'); // pos.left
      div.css('width',   '40em'); 
      div.css('height',  '10em'); 


//      div.css({
//         position: 'absolute',
//         top: anchor.height(),
//         left:pos.left,
//         width: '40em' 
//      });
   };
   

   this.FilterVendorChoices  = function(target) {

      self.grid.data.SetAgeFilter(val);



//      var html = "<table><tr><td>id</td><td>name</td></tr></table>";
      var vc = self.GetVendorChoices();
//      vc.html(html);
      return vc;
   };

   this.GetVendorChoices  = function(target) {

//      debugger;

      var vcDiv = $('#vendorchoices');
      if (vcDiv.length == 1) return vcDiv;
////    var html = '<div id="vendorchoices" class="vendorchoices"></div>';
//
//      var html = '<div id="vendorchoices" class="vendorchoices">';
//      html += '<ul>';
//      for (var i=0; i<self.itemVendorArray.length; i++) {
//         var info = self.itemVendorArray[i];
//         html += '<li>' + info[0] + ' - ' + info[1] + '</li>';
//      }     
//      html += '</ul>';
//      html += '</div>';
//
//      $(html).insertAfter("#maincontainer");
//
//      return $('#vendorchoices');

      var html = '<div id="vendorchoices" class="vendorchoices">';
      html += '<table><tr><td>id</td><td>name</td></tr>';
      for (var i=0; i<self.itemVendorArray.length; i++) {
         var info = self.itemVendorArray[i];
         html += '<tr><td>' + info[0] + '</td><td>' + info[1] + '</td></tr>';
      }     
      html += '</table>';
      html += '</div>';
      $(html).insertAfter("#maincontainer");
      return $('#vendorchoices');
   };

   
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

   this.Message = function(text) {
      var div = $("#messagediv pre");
      div.append(text+"<br/>");
      setTimeout(function () {$("#messagediv")[0].scrollTop = 9999999}, 10);
   };
   
   this.PointMessage = function(text, point) {
      self.Message(text+" ("+point.x+","+point.y+")");
   };
   this.Init(canvasElement, options);
};
                             



