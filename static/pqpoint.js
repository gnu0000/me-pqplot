//
// Point() - part of pqplot
//
// note: the api is an experiment: most fns are in-place mods rather than functions.
// The motivation is to allow jquery-like chaining so you can do stuff like this:
// var center = self.plotSize.Copy().Scale(0.5).Offset(self.plotStartPos);
//
// We'll see if this is a convenience or an annoyance by the time were done ...
//
// fn's starting with _ are statics
//
// constructor options: Point(), Point(point), Point(x,y), Point({x:44, y:55})
//
// Craig Fitzgerald
//
//

function Point(x,y) {
   var self = this;
   
   this.Init = function(x,y) {
      self.Set(x,y);
   };
                    //(point) ok
   this.Set = function(x,y) {
      self._params(x,y);
      self.x = self.xParam; 
      self.y = self.yParam;
      return self;
   };

   this.Copy = function () {
      return new Point(self.x, self.y);
   };

   this.Scale = function(x,y) {
      self._params(x,y);
      self.x *= self.xParam;
      self.y *= self.yParam;
      return self;
   };

   this.UnScale   = function(x,y) {
      self._params(x,y);
      self.x /= self.xParam;
      self.y /= self.yParam;
      return self;
   };

                    //(point) ok
   this.Offset    = function(x,y) {
      self._params(x,y);
      self.x += self.xParam;
      self.y += self.yParam;
      return self;
   };

                    //(point) ok
   this.UnOffset  = function(x,y) {
      self._params(x,y);
      self.x -= self.xParam;
      self.y -= self.yParam;
      return self;
   };
   
   this.FlipYAxis = function(ySize) {
      self.y = ySize - self.y;
      return self;
   };
                    //(point) ok
   this.Min = function(x,y) {
      self._params(x,y);
      self.x = Math.min(self.x, self.xParam);
      self.y = Math.min(self.y, self.yParam);
      return self;
   };
      
                    //(point) ok
   this.Max = function(x,y) {
      self._params(x,y);
      self.x = Math.max(self.x, self.xParam);
      self.y = Math.max(self.y, self.yParam);
      return self;
   };

   this.Range = function(val) {
      self.x = Math.min(self.x, val);
      self.y = Math.max(self.y, val);
      return self;
   };


   this.Round = function(precision) {
      self.x = Math.floor(self.x * precision + 0.5) / precision;
      self.y = Math.floor(self.y * precision + 0.5) / precision;
      return self;
   };

   this.Negate = function() {
      self.x = 0-self.x;
      self.y = 0-self.y;
      return self;
   };

   this.BindWithin = function (min, max) {
      self.x = Math.max(self.x, min.x);
      self.x = Math.min(self.x, max.x);
      self.y = Math.max(self.y, min.y);
      self.y = Math.min(self.y, max.y);
      return self;
   };

   this.RelativeTo = function (x,y) {
      self._params(x,y);
      self.x = self.x < 0 ? self.xParam + self.x : self.x;
      self.y = self.y < 0 ? self.yParam + self.y : self.y;
      return self;
   };
      



//   // 1=set,2=add,3=mult,4=mod
//   this.Adjust = function (x,y,operx,opery) {
//      self._params(x,y);
//      if (operx==1) self.x  = x;
//      if (operx==2) self.x += x;
//      if (operx==3) self.x *= x;
//      if (operx==4) self.x %= x;
//      if (opery==1) self.y  = y;
//      if (opery==2) self.y += y;
//      if (opery==3) self.y *= y;
//      if (opery==4) self.y %= y;
//      return self;
//   };      

   // not a true distance, this needs to be fast
   this.IsCloseTo = function(x, y, distance) {

      self._params(x,y);
      if (typeof x == "object") distance = y;

      var ndistance = 0-distance;
      var dx = self.x - self.xParam;
      var dy = self.y - self.yParam;
      return ((dx <= distance && dx >= ndistance &&
               dx <= distance && dx >= ndistance)
              ? 1 : 0);
   };
   
   this.AsString = function(label) {
      var str = (arguments.length > 0 ? label + ":" : "");
      str += "["+ Math.floor(self.x*1000)/1000 + "," + Math.floor(self.y*1000)/1000 + "]";
      return str;
   };

   this._Diff = function(point1, point2) {
      self._params(x,y);
      return new Point(point1.x-point2.x, point1.y-point2.y);
   } ;

   this._Add = function(point1, point2) {
      self._params(x,y);
      return new Point(point1.x+point2.x, point1.y+point2.y);
   };

   // allow params to be (x,y) or (point)
   this._params = function(x,y) {
      var tt = typeof x;
      
      if (x == undefined) {
         self.xParam = self.yParam = 0;
      } else if (typeof x == "object") {
         self.xParam = x.x - 0;
         self.yParam = x.y - 0;
      } else {
         self.xParam = x - 0; 
         self.yParam = y - 0;
      };
      return self;
   };

   this.Init(x,y);
};
