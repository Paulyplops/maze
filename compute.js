

var levelCount = 10;
var stageCount = 3;

var levels;
var level;
var stage;
var stages;
var dimensions;
var str = "";
var ratios;
var ratio;
var boring;
var impossible;

var compute = function() {
  ratios = Object.keys( allLevels );
  setTimeout( start, 50 );
}

var start = function() {
  if( ratios.length ) {
    var ratioString = ratios.pop();
    ratio = parseFloat( ratioString );

    // Arbitrary selection of 800 width.
    canvasDimensions = [ 800, 800 * ratio ];
    level = 0;
    stage = 0;
    levels = [];
    stages = [];

    boring = 0;
    impossible = 0;

    setTimeout( step, 50 );
  }
  else
  {
    $("#d").html( "" );
  }
}

var step = function() {
  var s = loadLevel( level, stage );
  if( s > 0 ) {
    levels.push( [level,Math.floor( s ) ] );
  }
  else if( s == 0 )
  {
    boring++;
  }
  else
  {
    impossible++;
  }

  $("#d").html( "<p><code>" + stage + " " + levels.length + "</code></p>" );
 
  level++;

  if( levels.length != levelCount ) 
    setTimeout( step, 50 );
  else
    setTimeout( next, 50 );
}

var next = function() {

  stages[ stage ] = levels.sort( function( a, b ){ return a[1] - b[1]; } );

  levels = [];

  stage++;

  if( stage != stageCount ) 
    setTimeout( step, 50 );
  else
    setTimeout( finish, 50 );

}

var finish = function() {

  str += 'allLevels[ "' + ratio.toString() + '" ] = [ ';
  var comma = " ";
  for( var s = 0; s < stageCount; ++s ) {
    var levels = stages[ s ];
    str += " [";
    for( var l = 0; l < levels.length; ++l ) {
      str += " ["+ levels[ l ] + "],";
    }
    str = str.substring( 0, str.length - 1 );
    str += " ],";
  }
  str = str.substring( 0, str.length - 1 );
  str += " ];\n";

  $("#out").html( "<p><code><pre>" + str + "</pre></code></p>" );

  console.log( ratio.toString() + " Boring: " + boring + " Impossible: " + impossible );

  // Restart with next size.
  setTimeout( start, 50 );

}

$(function() {
  $("#calc").on( "click", function(){ 
    compute(); 
  });
});


