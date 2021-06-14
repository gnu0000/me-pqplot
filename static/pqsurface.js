// Craig Fitzgerald

function PQSurface(canvasElement, options) {
   var self = this;

   this.Init = function(canvasElement, options) {
      self.InitAttributes(canvasElement, options);
      self.InitEvents();
      self.InitState();
   };

   this.InitAttributes = function(canvasElement, options) {
      self.options = $.extend({
         hasgradient             : 0,
         colorBackgroundTop      : "#FFF",
//       colorBackgroundBottom   : "#85C585"
         colorBackgroundBottom   : "rgb(159,202,244)"
      }, options || {});

      self.canvas     = canvasElement;
      self.context    = self.canvas.getContext('2d');
      self.canvasSize = new Point(self.canvas.clientWidth, self.canvas.clientHeight);

   self.bkgGradient  = self.context.createLinearGradient(0, 0, 0, self.canvas.clientHeight);
   self.bkgGradient.addColorStop(0, self.options.colorBackgroundTop);
   self.bkgGradient.addColorStop(1, self.options.colorBackgroundBottom);
   };   

   this.InitEvents = function() {
   };   

   this.InitState = function() {
   };   

   this.Clear = function() {
      if (self.options.hasgradient == 1){
         self.context.fillStyle = self.bkgGradient;
         self.context.fillRect(0, 0, self.canvasSize.x, self.canvasSize.y);
      } else {
         var width = self.canvas.width;
         self.canvas.width = 1;
         self.canvas.width = width;
      }
   };

   this.Rotate = function(val) {
      self.context.rotate(val);
   };

   this.Translate = function(point) {
      self.context.translate(point.x, point.y);
   };

   this.Polygon = function(pointArray) {
      var start = pointArray.shift()
      self.context.beginPath();
      self.MoveTo(start);
      for (var i=0; i<arguments.length; i++){
         pts = arguments[i];
         for (var j=1; i<pts.length; j++){
            self.LineTo(pts[j]);
         }
      }
      self.MoveTo(start);
      context.fill();
   };


   // adapter, maybe useless, maybe should be SetFillStyle
   this.SetColor = function(color)       {self.context.fillStyle = color;   };
   this.SetStrokeColor = function(color) {self.context.strokeStyle = color; };
   this.SetFont = function(font)         {self.context.font = font;        };

   // adapter, maybe useless
   this.Text = function (text, point, color) {
      if (arguments.length > 2) self.SetColor(color);
      self.context.fillText(text, point.x, point.y);
   };

   
   // html5 measureText doesn't give us height. that is strange indeed
   //
   this.TextWidth = function(text) {
      var size = self.context.measureText(text, 0, 0);
      return size.width;
   }
   
   this.BeginPath = function (point) {
      self.context.beginPath();
   };
   this.MoveTo = function (point) {
      self.context.moveTo(point.x, point.y);
   };
   this.LineTo = function (point) {
      self.context.lineTo(point.x, point.y);
   };
   this.Fill = function () {
      self.context.fill();
   };

   
   // todo: name it DrawLine   
   // width and color are optional
   this.Line = function (point1, point2, thickness, color) {
      if (arguments.length < 3) thickness = 1;
      if (arguments.length > 3) self.SetStrokeColor(color);
      
      self.context.beginPath();
      self.context.moveTo(point1.x, point1.y);
      self.context.lineTo(point2.x, point2.y);
      self.context.lineWidth = thickness;
      self.context.stroke();
   };
   
   this.HLine = function (y, x1, x2, thickness, color) {
      return self.Line({x:x1, y:y}, {x:x2, y:y}, thickness, color);
   };
   
   this.VLine = function (x, y1, y2, thickness, color) {
      return self.Line({x:x, y:y1}, {x:x, y:y2}, thickness, color);
   };
   
   // for now its a filled circle with a 1px black outline
   //   
   this.Circle = function (point, radius) {
      self.context.beginPath();
      self.context.arc(point.x, point.y, radius, 0, 2 * Math.PI, false);
      self.context.fill();
      self.context.lineWidth = 1;
      self.context.stroke();
   };

   this.Message = function(text) {
      var div = $("#messagediv pre");
      div.append(text+"<br/>");
      setTimeout(function () {$("#messagediv")[0].scrollTop = 9999999}, 10);
   };
   
   
   this.Init(canvasElement, options);
};
