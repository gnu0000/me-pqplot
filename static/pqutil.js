//
//
//
//

Math.__proto__._Log10 = function(val) {
   if (val == 0) return 0;
   return Math.log(val)/Math.LN10;
};


Math.__proto__.Exp10 = function(val) {
   return Math.exp(val * Math.LN10);
};

// not really a round, for decimals 
Math.Round = function(val, precision) {
   if (arguments.length == 1) precision = 1000;
   return val = Math.floor(val * precision) / precision;
}

//Math.__proto__.InRange = function(val,min,max) {
//   return (val >= min) && (val <= max);
//}


// Cribbed from bidx, which was from appia, which came from an old demo of mine
// Its interesting to see how things grow over time...
//
//This function can format numbers. I took this from Appia but changed it up a some.
//It can for currency, percentage, fixed decimal point, and it will always 'commify' the number.
//'currencysymbol' and 'suffixsymbol' are optional, but you use 'suffixsymbol', you need to have something for 'currencysymbol' even if its blank ''
//
Number.__proto__.FormatNumber = function (number, decimals, currencysymbol, suffixsymbol)
   {
   number = number + ''; // convert to string so we can use replace
   
   var val = number.replace(/[$,%]/g, "")  // Added for ease of use... don't want to have funny commas etc coming in here

   if ((!val && val != "0") || isNaN (val) || (val == "" && val != "0")) // bizarre but true: "0" is a blank
      return "";
   if (arguments.length < 4)  suffixsymbol   = "";
   if (arguments.length < 3)  currencysymbol = "";
   if (arguments.length < 2)  decimals       = 2;

   if(val - 0 < 0)
      {
      var prefix = '-';
      val = val.substr(1);
      }
   else
      var prefix = '';

   var tmp1 = parseFloat(val).toFixed(decimals).split("").reverse().join("") // reverse

   for (var i = 0, z = 0, sawdp = ((decimals == 0) ? 1 : 0), tmp2 = '', c = ''; i < tmp1.length; i++) // commify
      {
      c = tmp1.charAt (i);
      tmp2 = tmp2 + c;
      z = (z + 1) % 3;

      if (c == '.')
         sawdp = 1, z = 0;
      else if (sawdp && !z && i + 1 < tmp1.length && c != '-' && tmp1.charAt(i+1) != '-')
         tmp2 = tmp2 + ',';
      }
   tmp1 = tmp2.split("").reverse().join("") // reverse back

   return prefix + currencysymbol + tmp1 + suffixsymbol;
   }


