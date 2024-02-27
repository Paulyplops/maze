
var failure = "";

var check = function( f, m ) {
  if( !f ) {
    failure += m;
    failure += '\n';
  }
}

var colourConversions = function() {
  check( rgbToHex( [255,255,255] ) == "#ffffff", "rgbToHex1" );
  check( rgbToHex( [50,100,150] ) == "#326496", "rgbToHex2" );
  check( rgbToHex( labToRgb( [0,0,0] ) )  == "#000000", "labToRgb1" );
  check( rgbToHex( labToRgb( [100,0,0] ) ) == "#ffffff", "labToRgb2" );
  check( rgbToHex( labToRgb( [34.188,8.072,-32.478] ) ) == "#384f84", "labToRgb3" );
  
  if( failure ) {
    $("#colour_conversions").addClass("failed");
    $("#colour_conversions").text( failure );
  } else {
    $("#colour_conversions").addClass("passed");
  }
}

colourConversions();





