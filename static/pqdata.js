//
// pqdata.js 
// Manages the data for pqplot
//
// Craig Fitzgerald


// constants
//
// todo:  remove coeff layer
//
var DEFAULT_MAX_AGE     = 240; // months
var DEFAULT_LOW_BIDDERS = 99;


// The TDistribution at the 90% confidence level, used for calculating the
// Confidence interval in the Price/Quantity Plot I got this from Jeanese
// who generated it in SAS.
var TDISTRIBUTION_90 =
   [0,  6.31375,  2.91999,  2.35336,  2.13185,  2.01505,
        1.94318,  1.89458,  1.85955,  1.83311,  1.81246,
        1.79588,  1.78229,  1.77093,  1.76131,  1.75305,
        1.74588,  1.73961,  1.73406,  1.72913,  1.72472,
        1.72074,  1.71714,  1.71387,  1.71088,  1.70814,
        1.70562,  1.70329,  1.70113,  1.69913,  1.69726,
        1.69552,  1.69389,  1.69236,  1.69092,  1.68957,
        1.6883 ,  1.68709,  1.68595,  1.68488,  1.68385,
        1.68288,  1.68195,  1.68107,  1.68023,  1.67943,
        1.67866,  1.67793,  1.67722,  1.67655,  1.67591,
        1.67528,  1.67469,  1.67412,  1.67356,  1.67303,
        1.67252,  1.67203,  1.67155,  1.67109,  1.67065,
        1.67022,  1.6698 ,  1.6694 ,  1.66901,  1.66864,
        1.66827,  1.66792,  1.66757,  1.66724,  1.66691,
        1.6666 ,  1.66629,  1.666  ,  1.66571,  1.66543,
        1.66515,  1.66488,  1.66462,  1.66437,  1.66412,
        1.66388,  1.66365,  1.66342,  1.6632 ,  1.66298,
        1.66277,  1.66256,  1.66235,  1.66216,  1.66196,
        1.66177,  1.66159,  1.6614 ,  1.66123,  1.66105,
        1.66088,  1.66071,  1.66055,  1.66039,  1.66023,
        1.66008,  1.65993,  1.65978,  1.65964,  1.6595 ,
        1.65936,  1.65922,  1.65909,  1.65895,  1.65882,
        1.6587 ,  1.65857,  1.65845,  1.65833,  1.65821,
        1.6581 ,  1.65798,  1.65787,  1.65776,  1.65765];
        

//////////////////////////////////////////////////////////////////////////////
//
// Data class representing the data in the grid
// part of pqplot
//
// options:
//     itemnumber
//     datasource
//     maxAge
//     lowBidders
//     bidderFilterList
//     proposalList    
//     outlierList     
//     logPrice
//     logQuan
//     dataFetchSuccess
//     dataFetchError
//     dataFetchComplete
//
function PQData(options) {
   var self = this;

   this.Init = function(options) {
      self.InitAttributes(options);
      self.InitState();
   };

   this.InitAttributes = function(options) {
      self.options = $.extend({
         itemnumber       : "500-0100"          ,
         database         : "iadot"             ,
         datasource       : "/fetchdata.pl"     ,
         maxAge           : DEFAULT_MAX_AGE     ,
         lowBidders       : DEFAULT_LOW_BIDDERS ,
         bidderFilterList : []                  ,
         logPrice         : 1                   ,   
         logQuan          : 1                   ,
         localStoreKey    : "pq"
      }, options || {});

      self.coeff        = {ok: 0};
      self.outlierCount = 0;

      self.FetchSavedParams();

      $.each(self.options, function(option, defaultValue) {
         self.SetIfCGIParam(option);       // high priority   : values passed as cgi parameters
      });
   };

   this.SetIfCGIParam = function(option) {
      if (self.CGIParamExists(option.toLowerCase()))
         self.options[option] = self.CGIParam(option.toLowerCase());
   };

   this.InitState = function() {
      self.FetchData();
   };

   //
   //
   this.Recalc = function(dataWasRefetched) {
      if (arguments.length < 1) dataWasRefetched = 1;
      if (dataWasRefetched){
         self.IndexData();
         self.InitBidFlags();
         self.InitAge(); // for now
         self.InitFilters();
      }
      self.CalcParams();
      if (self.options.dataReady) self.options.dataReady(dataWasRefetched);
   };

   this.IndexData = function(){
      self.bidIndex = {};
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         bid.id = bid.contid + "|" + bid.linenumber + "|" + bid.bidderid;
         self.bidIndex[bid.id] = i;
         bid.rank = bid.rank - 0;
         bid.colorIndex = 0; // im cheating. todo: save/restore colorfilter
      }
   };

   this.InitBidFlags = function(){
      for (var i=0; i<self.biddata.length; i++){
         self.biddata[i].exclude = 0;
      }
   };
   
   this.InitAge = function(){
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         bid.age = self.GetAge(bid.lettingdate);
      }   
   };

   this.GetAge = function(dateString) {
      var formattedDate = dateString.substring(0,10);
      var t0 = Date.parse(formattedDate);

      var today = new Date();
      var t1 = today.getTime();

      var diff = t1 - t0;
      var monthLen = 1000*60*60*24*30.5;
      var age = Math.floor(diff / monthLen);
      return age;
   };

   this.AgeRange = function(){
      var ageRange = new Point(999,-1);
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         if (bid.exclude == 1) continue;
         ageRange.Range(bid.age);
      }
      return ageRange;   
   }


//   this.SetOutlierFilter = function(bid, reset) { // for external use
//      if (reset == 1) self.outlierList = [];
//      if (bid !== undefined) self.outlierList.push(bid);
//      return self.Recalc(0);
//   };

   this.MarkAsOutliers = function(bids){
      for (var i=0; i<bids.length; i++){
         var bid = self.biddata[bids[i]];
         bid.outlier = 1;
         bid.exclude = 1;
      }
      self.SaveOutliers();
   };

   this.SaveOutliers = function(){
      var outies = [];
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         if (bid.outlier == 1)
            outies.push(bid.id);
      }
      self.outlierCount = outies.length;
      if (!self.HasLocalStorage()) return;

      var key  = self.LocalStorageKey(0,self.options.itemnumber + "outliers");

      if (self.outlierCount == 0){
         delete localStorage[key];
         return;
      }
      var data = JSON.stringify(outies);
      localStorage[key] = data;
   };

   this.GetOutlierCount = function(){
      return self.outlierCount;
   };

   this.GetMaxAge = function(){
      return self.options.maxAge;
   };

   this.GetMaxRank = function(){
      return self.options.maxRank;
   };

   this.ResetOutliers = function(){
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         bid.outlier = 0;
         bid.exclude = bid.hirank || bid.old  ? 1 : 0; // for now
      }
      self.SaveOutliers();
   };


   this.HasLocalStorage = function(){
      if('localStorage' in window && window['localStorage'] !== null)
         return 1;
      return 0;
   };

   this.InitFilters = function(){
      self.SetAgeFilter(self.options.maxAge, 1);
      self.SetRankFilter(self.options.maxRank, 1);
      self.InitOutliersFilter();
   }


   this.SetAgeFilter  = function(maxAge, init) { // for external use
      maxAge = maxAge - 0;
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         bid.old = (bid.age > maxAge ? 1 : 0);
         bid.exclude = bid.hirank || bid.outlier || bid.old ? 1 : 0; // for now
      }
      self.options.maxAge = maxAge;
      if (init == 1) return;
         
      self.SaveFilterParams();
      self.Recalc(0);
   };
      
   this.SetRankFilter  = function(maxRank, init) { // for external use
      maxRank = maxRank - 0;
      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         bid.hirank = (bid.rank > maxRank ? 1 : 0);
         bid.exclude = bid.hirank || bid.outlier || bid.old  ? 1 : 0; // for now
      }
      self.options.maxRank = maxRank;
      if (init == 1) return;
         
      self.SaveFilterParams();
      self.Recalc(0);
   };

   // this one uses local storage directly
   //
   this.InitOutliersFilter = function(){
      self.outlierCount = 0;
      if (!self.HasLocalStorage()) return;

      var key  = self.LocalStorageKey(0,self.options.itemnumber + "outliers");
      var outliers = localStorage[key];
      if (!outliers) return;

      var outies = JSON.parse(outliers);
      self.outlierCount = outies.length;
      for (var i=0; i<self.outlierCount; i++){
         var index = self.bidIndex[outies[i]];
         var bid = self.biddata[index];
         bid.outlier = 1;
         bid.exclude = 1;
      }
   };



//   // bidder: empty=all, nonempty=include list
//   // todo:  action: 1=add, 2=delete, 3=reset
//   this.SetBidderFilter = function(bidder, reset) { // for external use
//      if (reset == 1) self.bidderList = [];
//      if (bidder !== undefined) self.bidderList.push(bidder);
//      return self.Recalc(0);
//   };

   // bidder: empty=all, nonempty=include list
   // action: 1=add, 2=delete, 3=reset
   this.SetBidderFilter = function(bidderid, action) { // for external use
      if (bidderid === undefined) bidderid = "dummy";
      
      if (action == 1) self.bidderFilterList[bidderid] = 1;
      if (action == 2) self.bidderFilterList[bidderid] = 0;
      if (action == 3) self.bidderFilterList           = [];

//      if (action == 1) self.bidderList[];
//      if (action == 1) self.bidderList = [];
//      if (action == 1) self.bidderList = [];
//      if (bidder !== undefined) self.bidderList.push(bidder);

      var exclusive = 0;
      $.each(self.bidderList, function(bidderid, value) {
         exclusive += value;
      });
      var defaultState = exclusive > 0 ? 0 : 1;

      for (var i=0; i<self.biddata.length; i++){
         var bid = self.biddata[i];
         var state = self.bidderFilterList[bid.bidderid];

         if (state === undefined) state = defaultState;
         bid.excludedvendor = state;

         bid.exclude = bid.hirank || bid.outlier || bid.old || bid.excludedvendor ? 1 : 0; // for now
      }
      return self.Recalc(0);
   };


   
   // empty=all, nonempty=include list
   this.SetProposalFilter = function(contid,reset) { // for external use
      if (reset == 1) self.proposalList = [];
      if (contid !== undefined) self.proposalList.push(contid);
      return self.Recalc(0);
   };

   this.BidsWithin = function(min, max) {
      var matches = [];

      if (!self.biddata) return matches;

//      for (var i=0; i<self.biddata.length; i++) {
      for (var i=self.biddata.length-1; i>=0; i--) {
         var bid = self.biddata[i];
         if (bid.exclude == 1) continue;
         var quantity = bid.quantity-0;
         var bidprice = bid.bidprice-0;

         if (quantity < min.x) continue;;
         if (bidprice < min.y) continue;;
         if (quantity > max.x) continue;;
         if (bidprice > max.y) continue;;
         matches.push(i);
      }
   return matches;
   };



   this.FetchData = function() {
      if (self.options.dataFetchStart) self.options.dataFetchStart();

      var url = self.ConstructQueryURL();
      $.ajax({
         url:      url,
         success:  self.FetchSuccess,
         error:    self.FetchError,
         complete: self.FetchComplete
      });
   };
   
   this.ConstructQueryURL = function() {
      var url = self.options.datasource + "?itemnumber=" + encodeURI(self.options.itemnumber);
      if (self.options.maxage) url += "&maxage=" + encodeURI(self.options.maxage);
      return url;
   };
   
   this.FetchSuccess = function(data) {
      self.biddata = data;
      self.Recalc(1);
   };
   
   this.FetchError = function(xhr) {
      if (self.options.dataFetchError) self.options.dataFetchError(xhr);
   };

   this.FetchComplete = function(xhr) {
      if (self.options.dataFetchComplete) self.options.dataFetchComplete(xhr);
   };


   this.CalcParams = function() {
      self.CalcMinMax();
      self.CalcRegressionCoefficients();
      if (self.options.debug) self.DebugStats();
   };


   // calculates the following atts:
   //  self.min : min x and y values (quan,price)
   //  self.max : max x and y values (quan,price)
   //
   this.CalcMinMax = function() {
      self.min = new Point(Number.MAX_VALUE , Number.MAX_VALUE );
      self.max = new Point(-Number.MAX_VALUE, -Number.MAX_VALUE);

      self.activeCount   = 0;  
      self.excludedCount = 0;    
      for (var i=0; i<self.biddata.length; i++) {
         var bid   = self.biddata[i];
         bid.exclude ? self.excludedCount++ : self.activeCount++;
         if (bid.exclude == 1) continue;

         var bidPoint = {x:bid.quantity-0, y:bid.bidprice-0};
         self.min.Min(bidPoint);
         self.max.Max(bidPoint);
      };
   };


   // calculates the following coefficient values:
   //   
   // self.coeff.avgX       - stuff
   // self.coeff.avgY       - stuff
   // self.coeff.sumSqDiff  - stuff
   // self.coeff.beta       - stuff
   // self.coeff.lambda     - stuff
   // self.coeff.sigma      - stuff
   // self.coeff.n          - stuff
   // self.coeff.tDist      - stuff
   //
   // This calculates data needed to give a regression price
   // i got pseudocode from Jeanese Nix in the mid 1990's!
   //   
   this.CalcRegressionCoefficients = function() {
      var coeff = self.coeff = {ok: 0};
      
//      coeff.n = self.biddata.length;
      coeff.n = self.activeCount;

      if (coeff.n < 3) return 0;
      if (self.ItemIsLumpSum()) return 0;
      
      self.CalcRCAverageXY(); 
      self.CalcRCBetaLambda();
      self.CalcRCSigma();     
      
      coeff.tDist = self.TDistribution ();
      coeff.ok = 1;
   };
   
   this.ItemIsLumpSum = function() {
      return false; // todo
   };

   
   // component of CalcRegressionCoefficients
   // 
   this.CalcRCAverageXY = function() {
      var coeff = self.coeff;
      
      coeff.avgX = 0;
      coeff.avgY = 0;
      for (var i=0; i<self.biddata.length; i++) {
         var bid      = self.biddata[i];
         if (bid.exclude == 1) continue;

         var price    = bid.bidprice-0;
         var quantity = bid.quantity-0;
         coeff.avgX  += (self.options.logQuan  && (quantity > 0.0001 || quantity < -0.0001) ? Math.log (quantity) : quantity);
         coeff.avgY  += (self.options.logPrice && (price    > 0.0001 || price    < -0.0001) ? Math.log (price)    : price   );
      }      
      coeff.avgX /= coeff.n;
      coeff.avgY /= coeff.n;
   };
   
   
   // component of CalcRegressionCoefficients
   // this computes the inverse eigenvalue matrix of the neutonian primaries and trojan points
   //
   this.CalcRCBetaLambda = function() {
      var coeff = self.coeff;
   
      coeff.num       = 0;
      coeff.sumSqDiff = 0;
      for (var i=0; i<self.biddata.length; i++) {
         var bid      = self.biddata[i];
         if (bid.exclude == 1) continue;

         var price    = bid.bidprice-0;
         var quantity = bid.quantity-0;
         var x        = (self.options.logQuan  && (quantity > 0.0001 || quantity < -0.0001) ? Math.log (quantity) : quantity);
         var y        = (self.options.logPrice && (price    > 0.0001 || price    < -0.0001) ? Math.log (price)    : price   );
         
         coeff.num       += (x - coeff.avgX)*(y - coeff.avgY);
         coeff.sumSqDiff += (x - coeff.avgX)*(x - coeff.avgX);
      };
      if (!coeff.sumSqDiff) return 0;
      coeff.beta   = coeff.num / coeff.sumSqDiff;
      coeff.lambda = coeff.avgY - coeff.beta * coeff.avgX
   };

   
   // component of CalcRegressionCoefficients
   // this does an inverse fast fourier transform of the comment characters
   //
   this.CalcRCSigma = function() {
      var coeff = self.coeff;
   
      coeff.num = 0;
      for (var i=0; i<self.biddata.length; i++) {
         var bid      = self.biddata[i];
         if (bid.exclude == 1) continue;
         var price    = bid.bidprice-0;
         var quantity = bid.quantity-0;
         var x        = (self.options.logQuan  && (quantity > 0.0001 || quantity < -0.0001) ? Math.log (quantity) : quantity);
         var y        = (self.options.logPrice && (price    > 0.0001 || price    < -0.0001) ? Math.log (price)    : price   );
         
         coeff.num += (y - coeff.lambda - coeff.beta * x) * 
                      (y - coeff.lambda - coeff.beta * x);
      }
      coeff.sigma = Math.sqrt (1/(coeff.n-2) * coeff.num);
   };


   // component of CalcRegressionCoefficients
   // this is just a comment, which can sometimes be very usefull
   //   
   this.TDistribution = function() {
      return TDISTRIBUTION_90[Math.min(120, Math.floor (self.coeff.n - 2))];
   };

   
   this.RegressionPrice = function (quantity) {
      var coeff = self.coeff;
      if (!coeff || coeff.ok== 0) return 0;
      var bidprice = coeff.lambda + coeff.beta * (self.options.logQuan ? Math.log (quantity) : quantity);
      if (self.options.logPrice) bidprice = Math.exp (bidprice);
      return bidprice;
   };
   
   
   this.RegressionPriceRange = function(quantity) {
      var coeff = self.coeff;
      if (coeff.ok== 0) return {quantity:quantity, minprice:0, maxprice:0};

      var logX = (self.options.logQuan ? Math.log (quantity) : quantity);
      var a = coeff.lambda + coeff.beta * logX;
      var b = coeff.tDist;
      var c = coeff.sumSqDif ? ((logX-coeff.avgX)*(logX-coeff.avgX))/coeff.sumSqDif : 0;
      var d = coeff.sigma * Math.sqrt (1/coeff.n + c);
      
      var minprice = (self.options.logPrice ? Math.exp(a - b * d) : a - b * d);
      var maxprice = (self.options.logPrice ? Math.exp(a + b * d) : a + b * d);
      return {quantity:quantity, minprice:minprice, maxprice:maxprice};
   };

   this.IsRegressionOK = function() {
      return self.coeff.ok;
   };

   
   this.RegressionPoint = function(x) {
      return new Point (x,self.RegressionPrice(x))
   };

   
   this.RegressionInterval = function(x) {
      var range = self.RegressionPriceRange(x);
      var min = new Point (x,range.minprice);
      var max = new Point (x,range.maxprice);
      return {min:min, max:max};
   };
   

   this.FetchSavedParams = function() {
      if (!self.HasLocalStorage()) return;

      var maxAgeKey   = self.LocalStorageKey(0, "maxAge");
      var maxAge      = localStorage[maxAgeKey];
      var maxRankKey  = self.LocalStorageKey(0,"maxRank");
      var maxRank     = localStorage[maxRankKey];
      var colorTypeKey= self.LocalStorageKey(0, "colorType");
      var colorType   = localStorage[colorTypeKey];

      if (maxAge > 0)  self.options.maxAge  = maxAge;
      if (maxRank > 0) self.options.maxRank = maxRank;
      self.options.colorType = colorType ? colorType : 0;
   };


   this.SaveFilterParams = function() {
      if (!self.HasLocalStorage()) return;

      var maxAgeKey  = self.LocalStorageKey(0,"maxAge");
      localStorage[maxAgeKey] = self.options.maxAge;
      var maxRankKey = self.LocalStorageKey(0,"maxRank");
      localStorage[maxRankKey] = self.options.maxRank;
      var colorTypeKey= self.LocalStorageKey(0, "colorType");
      localStorage[colorTypeKey] = self.options.colorType;
   };


   this.LocalStorageKey = function(isglobal, suffix){
      var key = self.options.localStoreKey + "_";
      if (isglobal==0)
         key = key + self.options.database + "_";
      key = key + suffix;
      return key;
   }
   
   
   this.CGIParamExists = function(name) {
      return (self.CGIParam(name) !== undefined);
   };
   
   this.CGIParam = function(name) {
      var url     = document.location.href;
      name        = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regexS  = "[\\?&amp;]" + name + "=([^&amp;#]*)";
      var regex   = new RegExp(regexS);
      var results = regex.exec(url);
      if (results == null) return undefined;
      return results[1];
   };
   
  
   this.DebugStats = function() {
      self.Message("--------Data--------------"                   );
      self.Message("self.coeff.avgX     : " + self.coeff.avgX     );
      self.Message("self.coeff.avgY     : " + self.coeff.avgY     );
      self.Message("self.coeff.sumSqDiff: " + self.coeff.sumSqDiff);
      self.Message("self.coeff.beta     : " + self.coeff.beta     );
      self.Message("self.coeff.lambda   : " + self.coeff.lambda   );
      self.Message("self.coeff.sigma    : " + self.coeff.sigma    );
      self.Message("self.coeff.n        : " + self.coeff.n        );
      self.Message("self.coeff.tDist    : " + self.coeff.tDist    );
   };
   
   
   this.Message = function(text) {
      var div = $("#messagediv pre");
      div.append(text+"<br/>");
      setTimeout(function () {div[0].scrollTop = 9999999}, 10);
   };
   
   
   this.Init(options);
};



