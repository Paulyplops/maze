
var background = "#aaaaaa";
var darkBackground = "#888888";
var font = "Corbert";

// Two canvas elements are layered on top of each other.
var c1 = document.getElementById('c1');
var c2 = document.getElementById('c2');
var c3 = document.getElementById('c3');

var ctx1 = null;
var ctx2 = null;
var ctx3 = null;

if( c1 ) ctx1 = c1.getContext('2d');
if( c2 ) ctx2 = c2.getContext('2d');
if( c3 ) ctx3 = c3.getContext('2d');




// Display dimensions [w,h] in pixels.
var displayDimensions = [];
// Maze dimensions [w,h] in maze units.
var mazeDimensions = [];
// Canvas dimensions.
var canvasDimensions = [];
// Half canvas dimensions.
var halfDimensions = [];
// Width / Height
var ratio;

// Array of coordinates [x,y].
var vertices = [];
// Array of polygon vertex indices [a,b,c...n].
var polygons = [];
// Array of edges on perimeter of tiling.
// Each edge is a pair of vertex indices [a,b].
// The edge is directed a->b.
// Edges on the perimeter also have a polygon index attribute p.
var perimeter = [];
// Each wall is a pair of vertex indices [a,b].
// The edge is not directed, a is always less than b.
// Walls also have two polygon index attributes p & q where p < q.
var walls = [];
// Graph connectivity.
// Vector of neighbour polygon indices for each polygon.
var dual = [];

// Polygon index for the start and end of the maze.
var startPolygon = -1;
var endPolygon = -1;

// Current state of random number generator.
var random = 0;

// The solution of the maze.
var solution = [];

// Set of squares we can get to.
var reachable = {};

// Position of finger if the finger is currently down,
// in the maze coordinates.  Undefined if the finger is up.
var touch = undefined;

// The current partial solution to the maze that the user has traced,
// a sequence of polygon indices, starting with startPolygon.
var path = [];

// Object containing the level colour scheme.
var palette = {
  dark: undefined,
  base: undefined,
  primary: undefined,
  secondary: undefined,
  highlight: undefined,
};

// Alias for device pixel ratio.
var dpr = window.devicePixelRatio;

// The polygon index last touched.
// For debugging and optimisation.
var lastTouched = -1;

// Fast lookup for polygon indexed by [ x / s, y / s ] 
// where [ x, y ] is a point and s in the binScale.
// Each entry is a list of polygon indices in for the location.
var polygonBins = {};
var binScale = 20;


// The perimeter sorted into one continuous array of vertex indices.
// There is an edge between element i and i + 1.
// Also one between the last element and the first.
// The start is arbitrary.
var sortedPerimeter = [];

// Indices into sortedPerimeter that mark the start and end of the loop
// excluding the exit polygon.
var sortedPerimeterStart = -1;
var sortedPerimeterEnd = -1;

// Walls grouped into continuous chains for faster drawing.
var sortedWalls = [];

// Walls for each polygon. 
// { p: [[a,b],[a,b],... ] }
// Where p is a polygon index, a and b are vertex indices for the wall.
// Faster, incremental redraws.
var groupedWalls = {};
// Perimeter edges for each polygon.
// { p: [[a,b],[a,b],... ] }
// Where p is a polygon index, a and b are vertex indices for the perimeter section.
var groupedPerimeter = {};

// The last path drawn.
// For incremental re-draws.  See refreshPath.
var lastPath = [];

// Last time advanceGame was called.
var lastTime = (new Date).getTime();
// Time in ms the level has been played.
var elapsedTime = 0;
// The time the level was started.
var startTime;

// Time in ms for the level.
var levelTime = 20000;

// The amount to advance.
// Set when a level is completed.
var advanceLevel = 0;

// The cost of a 'dot' on the timer in seconds.
var dot = 5;

// The levels lost for an incomplete path.
// Closer attempts are penalised less.
var levelPenalty = 0;

// The difficulty score of the current level.
// For diagnostics only.
var levelScore = 0;

// The state.
var state = {
  level: 0,
  score: 0,
  stage: 0,
  muteMusic: false,
  muteSounds: false
};

// For storing the game statistics.
var stats = {
};

// Vector of levels.
var stages;

// The maze levels.
// Vector of pairs [ s, d ] where
// s is the level seed used to generate everything and
// d is the difficulty.
var levels;

// Last level number completed.
var lastLevel = -1;

// Previous score for transition animation.
var lastScore;

// Finish time for last level.
var lastElapsedTime; 

// Constant time for the waiting animation.
var waitingTime = 5000;

// Waiting for the user to initiate the level.
// We are waiting for the user to press the button if waiting > 0.
// Initially we are in the waiting state.
var waiting = 0;

var menuTime = 5000;
var menu = 0;
var menuDragStart = undefined;
var menuDrag = [0,0];


// A button on the waiting screen that brings up the settings.
var settingsButton;

// Constant for the number of ms to show ready state.
var readyTime = 500;

// Time remaining for level ready animation.
// We are showing the ready state if ready > 0.
var ready = 0;

// Constant number of ms to show level celebration.
var completeTime = 500;

// Time remaining for level complete animation.
var complete = 0;

// Constant number of ms to show level commiseration.
var failTime = 2000;

// Time remaining for level failure animation.
var fail = 0;

var transition = 0;

var transitionTime = 2000;

// Position of maze start for transition animation.
var entrance;

// Unit vector for the direction into the maze.
var entranceDirection;

// Position of maze exit for transition animation.
var exit;

// Unit vector for the direction into the maze.
var entranceDirection;

// Settings screen.
var settings = 0;

// Some buttons that go on the settings screen.
var doneButton;
var muteMusicButton;
var muteSoundsButton;

// Number of iterations of refinement to apply.
var refine = 2;

// Visual feedback that we are not following your finger any more.
var feedback = 0;
var feedbackTime = 500;

// Von Neumann middle-square rand.
// From seed s returns random-ish number between 0-1.

var middleSquareRandom = function( s ) {
  var t = ( s + 131071 ) * 524287;
  var r =  ( t * t ) % 4093082899;
  var u = r & 0x00ffff00;
  var v = u >> 8;
  return v / 65535.0;
}

// Returns n numbers in the random-ish number sequence seeded with s.

var pseudoRandom = function() {
  random = middleSquareRandom( random );
  return random;
}

// Move random into closure!

var seedPseudoRandom = function( s ) {
  random = s;
}

// shim layer with setTimeout fallback.

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

// Convert [r,g,b] to #rrggbb hex format.

var rgbToHex = function( c ) {
  var clamp = function( c ) {
    return Math.round( Math.min( 255, Math.max( 0, c ) ) );
  }
  var r = clamp( c[0] );
  var g = clamp( c[1] );
  var b = clamp( c[2] );
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


var hexToRgb = function( h ) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec( h );
    return [ parseInt(result[1], 16),
             parseInt(result[2], 16),
             parseInt(result[3], 16) ];
}

// CIE-L*ab colourspace conversion.
// http://www.boronine.com/2012/03/26/Color-Spaces-for-Human-Beings/
// http://en.wikipedia.org/wiki/Lab_color_space#RGB_and_CMYK_conversions

var labToXyz = function( lab ) {
  var cieL = lab[0];
  var cieA = lab[1];
  var cieB = lab[2];
  var refX = 95.047;
  var refY = 100.0;
  var refZ = 108.883;
  var varY = ( cieL + 16 ) / 116.0;
  var varX = cieA / 500 + varY;
  var varZ = varY - cieB / 200.0;
  var varX3 = Math.pow( varX, 3 );
  var varY3 = Math.pow( varY, 3 );
  var varZ3 = Math.pow( varZ, 3 );

  if( varY3 > 0.008856 ) 
    varY = varY3;
  else                      
    varY = ( varY - 16 / 116.0 ) / 7.787;
  if( varX3 > 0.008856 ) 
    varX = varX3;
  else                      
    varX = ( varX - 16 / 116.0 ) / 7.787;
  if( varZ3 > 0.008856 ) 
    varZ = varZ3;
  else                      
    varZ = ( varZ - 16 / 116.0 ) / 7.787;

  return [ refX * varX, refY * varY, refZ * varZ ];
}

var xyzToRgb = function( xyz ) {
  var varX = xyz[0] / 100.0; //X from 0 to  95.047 (Observer = 2°, Illuminant = D65)
  var varY = xyz[1] / 100.0; //Y from 0 to 100.000
  var varZ = xyz[2] / 100.0; //Z from 0 to 108.883

  var varR = varX *  3.2406 + varY * -1.5372 + varZ * -0.4986
  var varG = varX * -0.9689 + varY *  1.8758 + varZ *  0.0415
  var varB = varX *  0.0557 + varY * -0.2040 + varZ *  1.0570

  if( varR > 0.0031308 ) 
    varR = 1.055 * Math.pow( varR, ( 1 / 2.4 ) ) - 0.055;
  else                     
    varR = 12.92 * varR;
  if( varG > 0.0031308 ) 
    varG = 1.055 * Math.pow( varG, ( 1 / 2.4 ) ) - 0.055;
  else                     
    varG = 12.92 * varG;
  if( varB > 0.0031308 ) 
    varB = 1.055 * Math.pow( varB, ( 1 / 2.4 ) ) - 0.055;
  else                     
    varB = 12.92 * varB;

  return [ varR * 255, varG * 255, varB * 255 ];
}

var labToRgb = function( c ) {
  return xyzToRgb( labToXyz( c ) );
}

var lshToRgb = function( c ) {
  var l = c[0];
  var s = c[1];
  var h = c[2];
  var a = Math.sin( h ) * s;
  var b = Math.cos( h ) * s;
  return labToRgb( [ l, a, b ] );
}

var brighten = function( h, n ) { 
  var rgb = hexToRgb( h );
  var r = rgb[0];
  var g = rgb[1];
  var b = rgb[2];
  var m = n * 50;
  r = Math.min( r + m, 255 );
  g = Math.min( g + m, 255 );
  b = Math.min( b + m, 255 );
  return rgbToHex( [ r, g, b ] ); 
}

var darken = function( h, n ) { 
  var rgb = hexToRgb( h );
  var r = rgb[0];
  var g = rgb[1];
  var b = rgb[2];
  var m = n * 50;
  r = Math.min( r - m, 255 );
  g = Math.min( g - m, 255 );
  b = Math.min( b - m, 255 );
  return rgbToHex( [ r, g, b ] ); 
}


// Ellipse drawing.

function drawEllipseByCenter(ctx, cx, cy, w, h) {
  drawEllipse(ctx, cx - w/2.0, cy - h/2.0, w, h);
}

function drawEllipse(ctx, x, y, w, h) {
  var kappa = .5522848,
      ox = (w / 2) * kappa, // control point offset horizontal
      oy = (h / 2) * kappa, // control point offset vertical
      xe = x + w,           // x-end
      ye = y + h,           // y-end
      xm = x + w / 2,       // x-middle
      ym = y + h / 2;       // y-middle

  ctx.beginPath();
  ctx.moveTo(x, ym);
  ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
  ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
  ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

}

var deepCopyArray = function( array ) {
  var copy = [];
  // Create deep copy.
  for( var i = 0; i < array.length; ++i ) {
    copy.push( array[ i ] );
  }
  return copy;
}

var deepCopyObject = function( object ) {
  var copy = {};
  // Create deep copy.
  var keys = Object.keys( object );
  for( var i = 0; i < keys.length; ++i ) {
    copy[ keys[ i ] ] = object[ keys[ i ] ];
  }
  return copy;
}

// Golden angle is approx 2.4.
// http://en.wikipedia.org/wiki/Golden_angle

var generatePalette = function( s ) {
  var palette = {};
  var r = middleSquareRandom( s );
  var h = r * Math.PI * 2;

  palette.base = rgbToHex( lshToRgb( [ 50, 60, h ] ) );
  palette.dark = rgbToHex( lshToRgb( [ 30, 30, h ] ) );
  
  palette.primary = rgbToHex( lshToRgb( [ 50, 30, h ] ) );
  palette.secondary = rgbToHex( lshToRgb( [ 45, 30, h ] ) );

  if( r > 0.5 )
    h += 2.4;
  else
    h -= 2.4;

  palette.highlight = rgbToHex( lshToRgb( [ 50, 95, h ] ) );

  return palette;
}

var addVertex = function( v ) {
  // When adding vertices we look for duplicates first.
  var thresh = 0.01;
  var n = vertices.length;
  for( var i = 0; i < n; ++i ) {
    var u = vertices[ i ];
    if( dist( v, u ) < thresh ) {
      return i;
    };
  };

  vertices.push( v );
  return n;
};

var perimeterFind = function( e ) {
  var n = perimeter.length;
  // Requires 'deep' search.
  for( var i = 0; i < n; ++i ) {
    if( equal( perimeter[ i ], e ) ) {
      return i;
    }
  }
  return -1;
}

var perimeterContains = function( e ) {
  return perimeterFind( e ) != -1;
}


var perimeterRemove = function( e ) {
  var i = perimeterFind( e );
  if( i != -1 ) {
    walls.push( makeWall( e[0], e[1], e.p, perimeter[i].p ) );
    perimeter.splice( i, 1 );
    return true;
  } else {
    return false;
  }
}

var addEdgeToPerimeter = function( e ) {
  if( perimeterContains( e ) ) {
    console.log( "Possible error?" );
  } else if( perimeterRemove( swap( e ) ) ) {
    // Remove item.
  } else {
    perimeter.push( e );
  }
};

var fillCanvas = function( ctx, col ) {
  ctx.fillStyle = col;  
  ctx.beginPath();  
  ctx.rect( 0, 0, canvasDimensions[0], canvasDimensions[1] );  
  ctx.closePath();  
  ctx.fill(); 
};

var iOS = function() {
  var iDevice = ['iPad', 'iPhone', 'iPod', 'iPhone Simulator'];
  return iDevice.indexOf( navigator.platform ) != -1;
}

var isMobile = function() {
  return navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i);
}

var resize = function() {
  if( isMobile() ) {
    // Viewport constrained by height.
    displayDimensions[0] = $(window).width();
    displayDimensions[1] = $(window).height();
  }
  else
  {
    // On web use arbitrary size.
    displayDimensions[0] = 600;
    displayDimensions[1] = 600;
    // Temporary iPad size for testing.
    displayDimensions[0] = 300;
    displayDimensions[1] = 400;
  }

  if( iOS() ) {
    // Canvas should have a higher density for iOS devices.
    // On android width and height have density already built in.
    canvasDimensions = mult( displayDimensions, dpr );
  } else {
    canvasDimensions[0] = displayDimensions[ 0 ];
    canvasDimensions[1] = displayDimensions[ 1 ];
  }

  canvasDimensions[2] = dpr;

  halfDimensions = div( canvasDimensions, 2.0 );

  if( c1 ) {
    c1.width = canvasDimensions[0];
    c1.height = canvasDimensions[1];
  }

  if( c2 ) {
    c2.width = canvasDimensions[0];
    c2.height = canvasDimensions[1];
  }

  if( c3 ) {
    c3.width = canvasDimensions[0];
    c3.height = canvasDimensions[1] * 0.3;
  }

  ratio = Math.floor( 100.0 * canvasDimensions[0] / canvasDimensions[1] ) / 100.0;

  // We will redraw a little later.
};

var addPolygonToPerimeter = function( polygon, p ) {
  var n = polygon.length;
  for( var i = 0; i < n - 1; ++i ) {
    addEdgeToPerimeter( makeEdge( polygon[ i ], polygon[ i + 1 ], p ) );
  }
  addEdgeToPerimeter( makeEdge( polygon[ n - 1 ], polygon[ 0 ], p ) );
}

var addPolygon = function( n, x, y, r, t ) {
  var p = [];
  for( var i = 0; i < n; ++i ) {
    var u = i * Math.PI * 2 / n + t;
    var a = x + Math.cos( u ) * r;
    var b = y - Math.sin( u ) * r 
    p[ i ] = addVertex( [ a, b ] );
  }

  addPolygonToPerimeter( p, polygons.length );

  polygons.push( p );
}

// Returns true if point x is inside polygon with index p.
// Intersection counting method.  Possible overkill with convex.

var polygonContains = function( x, p ) {
  var inside = false;
  var polygon = polygons[ p ];
  for( var i = 0, j = polygon.length - 1; i < polygon.length; j = i++ ) {
    var vi = vertices[ polygon[ i ] ];
    var vj = vertices[ polygon[ j ] ];
    var intersect = ((vi[1] > x[1]) != (vj[1] > x[1]))
            && (x[0] < (vj[0] - vi[0]) * (x[1] - vi[1]) / (vj[1] - vi[1]) + vi[0]);
    if( intersect ) {
      inside = !inside;
    }
  }
  return inside;
}

// Returns a pair of coordinates [ ul, lr ] representing the upper left and 
// lower right coordinates of the polygon.

var polygonBounds = function( p ) {
  var max = [ -99999999, -99999999 ];
  var min = [ +99999999, +99999999 ];
  var polygon = polygons[ p ];
  for( var i = 0; i < polygon.length; ++i ) {
    var v = vertices[ polygon[ i ] ];
    max = [ Math.max( max[ 0 ], v[ 0 ] ), 
            Math.max( max[ 1 ], v[ 1 ] ) ]
    min = [ Math.min( min[ 0 ], v[ 0 ] ), 
            Math.min( min[ 1 ], v[ 1 ] ) ]
  }
  return [ min, max ];
}

// Adds polygon p to the bin at x, if required.

var binPolygon = function( x, p ) {
  if( !( x in polygonBins ) ) 
    polygonBins[ x ] = [];

  if( polygonBins[ x ].indexOf( p ) == -1 ) 
    polygonBins[ x ].push( p );
}

// Cache the polygons into polygonBins for fast spacial lookup.

var binPolygons = function() {
  polygonBins = {};
  for( var p = 0; p < polygons.length; ++p ) {
    var bounds = polygonBounds( p );
    var xRange = [ Math.floor( bounds[ 0 ][ 0 ] / binScale ),
                   Math.floor( bounds[ 1 ][ 0 ] / binScale ) ];
    var yRange = [ Math.floor( bounds[ 0 ][ 1 ] / binScale ),
                   Math.floor( bounds[ 1 ][ 1 ] / binScale ) ];
    for( var x = xRange[ 0 ]; x <= xRange[ 1 ]; ++x ) {
      for( var y = yRange[ 0 ]; y <= yRange[ 1 ]; ++y ) {
        binPolygon( [ x, y ], p );
      }
    }
  }

  // For performance optimisation.
  var logUse = false;
  if( logUse ) {
    var keys = Object.keys( polygonBins );
    var c = 0;
    var v = 0;
    for( i in keys ) {
      v += polygonBins[ keys[ i ] ].length;
      ++c;
    }
    console.log( keys.length );
    console.log( v / c );
  }
}

// Perform a binary search to find the position in the array.

function binarySearch( searchElement, searchArray, fn ) {
  var stop = searchArray.length;
  var last;
  var p = 0;
  var delta = 0;

  do {
    last = p;
    var c = fn( searchArray[p], searchElement );
    if( c > 0 ) {
      stop = p + 1;
      p -= delta;
    } else if ( c == 0 ) {
      // FOUND A MATCH!
      return p;
    }

    delta = Math.floor( (stop - p) / 2 );
    p += delta; // If delta = 0, p is not modified and loop exits.

  } while( last !== p );

  return -1; // Found nothing.
};

// a & b are the vertices the wall connects.
// p & q are the polygons the wall separates.

var makeWall = function( a, b, p, q ) {
  if( a > b )
  {
    var c = a;
    a = b;
    b = c;
  }

  if( p > q )
  {
    var r = p;
    p = q;
    q = r;
  }

  return { 0:a, 1:b, p:p, q:q };
};

var makeEdge = function( a, b, p ) {
  return { 0:a, 1:b, p:p };
};

var cloneEdge = function( e ) {
  return { 0:e[0], 1:e[1], p:e.p };
};

var swap = function( e ) {
  return { 0:e[1], 1:e[0], p:e.p };
}

var equal = function( a, b ) {
  return a[0] == b[0] && a[1] == b[1];
}

var perpendicular = function( a ) {
  return [ a[1], -a[0] ];
}

var mid = function( a, b ) {
  return [ ( a[0] + b[0] ) / 2, ( a[1] + b[1] ) / 2 ];
}

var add = function( a, b ) {
  return [ a[0] + b[0], b[1] + a[1] ];
}

var sub = function( a, b ) {
  return [ a[0] - b[0], a[1] - b[1] ];
}

var len = function( a ) {
  return Math.sqrt( a[0] * a[0] + a[1] * a[1] );
}

var div = function( a, d ) {
  return [ a[0] / d, a[1] / d ];
}

var mult = function( a, m ) {
  return [ a[0] * m, a[1] * m ];
}

var norm = function( a ) {
  return div( a, len( a ) );
}

var rotate = function( v, a ) {
  var sa = Math.sin( -a );
  var ca = Math.cos( -a );
  return [ v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca ];
}

var dist = function( a, b ) {
  return len( sub( a, b ) );
}

var inside = function( x, a, b ) {
  return x[0] > a[0] && 
         x[1] > a[1] &&
         x[0] < b[0] && 
         x[1] < b[1];
}

// a & b are the vertices that make up the edge to add to.
// Returns false if the polygon extends beyond the display.

var addPolygonToEdge = function( n, a, b ) {
  var l = vertices.length;

  var va = vertices[ a ];
  var vb = vertices[ b ];
  var vd = sub( vb, va );
  var d = Math.PI * 2 / n;
  var x = vb;
  var p = [ a, b ];
  var v = [];
  var border = 0.9;

  var bounds = div( canvasDimensions, 2.0 );
  var lower = mult( bounds, -border );
  var upper = mult( bounds, border );

  for( var i = 2; i < n; ++i ) {
    var vd = rotate( vd, d );
    x = add( x, vd );
    if( !inside( x, lower, upper ) )
        return false;
    v[ i ] = x;
  }

  for( var i = 2; i < n; ++i ) {
    p[ i ] = addVertex( v[ i ] );
  }

  addPolygonToPerimeter( p, polygons.length );
  polygons.push( p );
  return true;
}

// Adds polygon with n sides to every edge of polygon p.

var addToPolygon = function( n, p ) {
  var polygon = polygons[ p ];
  var a = polygon[ 0 ];
  for( var i = 1; i < polygon.length; ++i ) {
    var b = polygon[ i ];
    addPolygonToEdge( n, b, a );
    a = b;
  }
  addPolygonToEdge( n, polygon[ 0 ], a );
}

// Adds polygons side n to each edge of the perimeter.

var addToPerimeter = function( n ) {
  var added = false;
  var edges = [];
  // Create deep copy of perimeter.
  // Adding the polygons will edit the perimeter.
  for( var e = 0; e < perimeter.length; ++e ) {
    var edge = perimeter[e];
    edges.push( cloneEdge( edge ) );
  }
 
  // Perimeter edges removed by processing will be skipped.
  for( var e = 0; e < edges.length; ++e ) {
    var edge = edges[e];
    if( !perimeterContains( edge ) ) {
      // Removed.
      continue;
    }
    added = addPolygonToEdge( n, edge[1], edge[0] ) || added;
  }

  return added;
}

// Locate maze entrance and exit.
// Start and end might not be connected!
// This is tested when the level is scored.

var findStartAndEnd = function() {
  var n = perimeter.length;
  var startIndex = Math.floor( pseudoRandom() * n );
  var endIndex = ( startIndex + Math.floor( n / 2 ) ) % n;
  // Sort perimeter radially.
  // Not completely convinced this is right.r
  /* 
  perimeter.sort( function( a, b ){
    // Mid point of perimeter edge.
    var va = mult( add( vertices[ a[ 0 ] ], vertices[ a[ 1 ] ] ), 0.5 );
    var vb = mult( add( vertices[ b[ 0 ] ], vertices[ b[ 1 ] ] ), 0.5 );
    // Angle difference.
    return Math.atan2( va[ 0 ], va[ 1 ] ) - Math.atan2( vb[ 0 ], vb[ 1 ] );
  } );
  */

  // Sort perimeter, and then re-order into continuous loop.
  var fn = function( a, b ){ return a[ 0 ] - b[ 0 ] };
  perimeter.sort( fn );
  var ordered = [];
  var j = 0;
  for( var i = 0; i < perimeter.length; ++i ) {
    var p = perimeter[ j ];
    ordered.push( p );
    j = binarySearch( [ p[1], p[0] ], perimeter, fn );
  }
  perimeter = ordered;

  startPolygon = perimeter[ startIndex ].p;
  endPolygon = perimeter[ endIndex ].p;
  path = [ startPolygon ];
}

// Wall indices for polygon p.

var polygonWalls = function( p ) {
  var w = [];
  for( var i = 0; i < walls.length; ++i ) {
    var wall = walls[i];
    if( wall.p == p || wall.q == p ) {
      w.push( i );
    }
  }
  return w;
}

var otherPolygon = function( wall, p ) {
  if( wall.p == p ) { 
    return wall.q;
  } else {
    return wall.p;
  }
}

// Dual indices for polygon p.

var polygonDual = function( p ) {
  var d = [];
  for( var i = 0; i < dual.length; ++i ) {
    var link = dual[i];
    if( link.p == p || link.q == p ) {
      d.push( i );
    }
  }
  return d;
}

var otherPolygon = function( wall, p ) {
  if( wall.p == p ) { 
    return wall.q;
  } else {
    return wall.p;
  }
}

// Returns the set { 0:true, 1:true,.. n:true }.

var range = function( n ) {
  var r = {};
  for( var i = 0; i < n; ++i ) {
    r[ i ] = true;
  }
  return r;
}

var pseudoRandomSelect = function( v ) {
  return v[ Math.floor( v.length * pseudoRandom() ) ];
}

// Creates maze paths in the fully walled-in set of polygons.

var buildMaze = function() {
  var unvisited = range( polygons.length );
  var p = startPolygon;
  var path = [];
  var stack = [];
  while( Object.keys( unvisited ).length ) {
    // Visit polygon p.
    delete unvisited[ p ];
    // Set of walls bordering unvisited areas.
    var w = polygonWalls( p );
    w = w.filter( function( i ){ return otherPolygon( walls[ i ], p ) in unvisited; } );
    // If we have got to the finish, stop walking.
    if( w.length && p != endPolygon ) {
      // Add to path.
      path.push( p );
      var n = pseudoRandomSelect( w );
      var q = otherPolygon( walls[ n ], p );
      // Record link.
      dual.push( walls[ n ] );
      // Remove wall.
      walls.splice( n, 1 );
      p = q;
    } else {
      // Remove dead-end p from the path.
      path.splice( path.indexOf( p ), 1 );
      if( path.length ) {
        // Pick an arbitrary point in the path.
        p = pseudoRandomSelect( path );
        var i = path.indexOf( p ) + 1;
        // Store chopped off bit.
        stack = stack.concat( path.slice( i ) );
        // Chop path back.
        path.splice( i, path.length - i );
      } else {
        // We have run out of path.
        if( stack.length ) {
          // Pick an arbitrary point in the stack.
          p = pseudoRandomSelect( stack );
          stack.splice( stack.indexOf( p ), 1 );
        } else {
          // Pick from 'unvisited'.
          p = pseudoRandomSelect( Object.keys( unvisited ) );
        }
      }
    }
  }
}

// Refine maze.
// Block any branches that are not contributing to difficulty.
// These are short branches and everything but the longest dead-end.

var pruneMaze = function() {
  var visited = {};

  var deepest = function( p, path ) {
    visited[ p ] = true;
    var s = path.concat( [ p ] );
    
    var w = polygonDual( p );
    var deep = [];
    for( var k = 0; k < w.length; ++k ) {
      var o = otherPolygon( dual[ w[ k ] ], p );
      if( o in visited ) {
        // Backtracking or cycle.
      } else {
        d = deepest( o, s ); 
        if( d.length > deep.length )
          deep = d;
      }
    }
    return [ p ].concat( deep );
  }

  // Mark solution as visited.
  for( var i = 0; i < solution.length; ++i ) {
    visited[ solution[ i ] ] = true;
  }
 
  // Build up list of dual indices to block.
  var block = {};

  var depthThreshold = 4;
  
  // Work way along solution looking for dead wood.
  for( var i = 0; i < solution.length; ++i ) {
    var p = solution[ i ];
    var w = polygonDual( p );
    for( var k = 0; k < w.length; ++k ) {
      var o = otherPolygon( dual[ w[ k ] ], p );
      if( solution.indexOf( o ) == -1 ) {
        var before = deepCopyObject( visited );
        // Examine branch.
        var deep = deepest( o, [] );

        var keys = Object.keys( visited );
        for( var j = 0; j < keys.length; ++j ) {
          var q = Math.floor( keys[ j ] );
          // Check for newly visited items only.
          if( q in before ) 
            continue;
           
          // Keep items in the deepest path,
          // unless the length is short.
          if( deep.indexOf( q ) != -1 && 
              deep.length > depthThreshold ) 
            continue;

          // Mark paths for blocking with walls.
          var x = polygonDual( q );
          for( var l = 0; l < x.length; ++l ) {
            var n = x[ l ];
            block[ n ] = true;
          }
        }
      }
    }

  }

  var keys = Object.keys( block );

  // Add walls.
  for( var j = 0; j < keys.length; ++j ) {
    var n = keys[ j ];
    var d = dual[ n ];
    // Add wall.
    walls.push( d );
  }

  // Remove paths, backwards to preserve indices.
  for( var j = keys.length - 1; j >= 0; --j ) {
    var n = keys[ j ];

    // Remove link.
    dual.splice( n, 1 );
  }

}


var refineMaze = function() {
  // Iterate through unreachable polygons.
  for( var p = 0; p < polygons.length; ++p )
  {
    if( p in reachable )
      continue;

    // Look for reachable neighbours.
    var w = polygonWalls( p );

    var starts = [];
    for( var k = 0; k < w.length; ++k ) {
      var o = otherPolygon( walls[ w[ k ] ], p );

      if( o in reachable ) {
        starts.push( o );
      }
    }

    // Search depth.
    var depth = 5;

    var exploreDetour = function( path, pathWalls, paths ) {
      var p = path[ path.length - 1 ];

      var w = polygonWalls( p );

      // Remove options that loop.
      w = w.filter( function( i ){ 
        return path.indexOf( otherPolygon( walls[ i ], p ) ) == -1; 
      } );

      // Terminate at depth.
      if( path.length > depth )
        w = [];

      // Terminate if we hit path.
      if( ( reachable[ p ] == true ) && ( path.length != 1 ) )
        w = [];

      // Explore.
      for( var k = 0; k < w.length; ++k ) {
        var v = walls[ w[ k ] ];
        var o = otherPolygon( v, p );
        exploreDetour( path.concat( [o] ), pathWalls.concat( [ v ] ), paths );
      }
      
      paths.push( pathWalls );
    }

    var exploreDual = function( path, pathDual, paths ) {
      var p = path[ path.length - 1 ];

      var w = polygonDual( p );

      // Remove options that loop.
      w = w.filter( function( i ){ 
        return path.indexOf( otherPolygon( dual[ i ], p ) ) == -1; 
      } );

      // Terminate at depth.
      if( path.length > depth )
        w = [];

      // Explore.
      for( var k = 0; k < w.length; ++k ) {
        var d = dual[ w[ k ] ];
        var o = otherPolygon( d, p );
        exploreDual( path.concat( [o] ), pathDual.concat( [d] ), paths );
      }
      
      paths.push( pathDual );
    }

    // For each start.
    for( var i = 0; i < starts.length; ++i ) {
      var start = starts[i];


      var detours = [];
      exploreDetour( [ start ], [], detours );

     
      // Work out candidate ends that can be walked to.
      var paths = [];
      exploreDual( [ start ], [], paths );

      // Return the last polygon in path given start.
      var last = function( p, path ) {
        for( var i = 0; i != path.length; ++i ) {
          p = otherPolygon( path[ i ], p );
        }
        return p;
      }

      // Find detours that share the end with paths.
      var loops = [];

      for( var k = 0; k < paths.length; ++k ) {
        var path = paths[ k ];
        var l = last( start, path );
        for( var y = 0; y < detours.length; ++y ) {
          var detour = detours[ y ];
          if( l == last( start, detour ) ) {
            loops.push( { score: detour.length - path.length, path: path, detour: detour } );
          }
        }

      }

      // Loops are scored by how much longer they make the path. 
      loops.sort( function( a, b ){ return a.score - b.score; } );

      var scenicRoute = loops[ loops.length - 1 ];

      if( scenicRoute.score > 0 ) {
        var p = start;
        for( var i = 0; i != scenicRoute.detour.length; ++i ) {
          p = otherPolygon( scenicRoute.detour[ i ], p );
          reachable[ p ] = true;
        }

        // Remove walls.
        for( var j = 0; j < scenicRoute.detour.length; ++j ) {
          var w = scenicRoute.detour[ j ];
          var n = walls.indexOf( w );
          // Record link.
          dual.push( w );
          // Remove wall.
          walls.splice( n, 1 );
        }

        var w = scenicRoute.path[ 0 ];
        var n = dual.indexOf( w );
        // Record wall.
        walls.push( w );
        // Remove link.
        dual.splice( n, 1 );
        
        continue;

      }

    }
  




  }


}

// Searches the maze starting at p building up back-links.
// Function f( q ) returns true if polygon q is excluded.

var explore = function( p, f ) {
  var links = {};
  links[p] = -1;
  // Search starts at p.
  var explore = {};
  explore[p] = true;

  while( true ) {
    var keys = Object.keys( explore );
    for( var j = 0; j < keys.length; ++j ) {
      var q = Math.floor( keys[j] );
      var w = polygonDual( q );
      for( var k = 0; k < w.length; ++k ) {
        var other = otherPolygon( dual[ w[ k ] ], q );
        if( other in links ) {
          // Already explored.
        } else if( f( other ) ) {
          // Record the link.
          links[ other ] = q;
          explore[ other ] = true;
        }
      }
      // Remove from set to explore.
      delete explore[ q ];
    }
    // Keep going until there is nothing to explore.
    if( keys.length == 0 )
      break;
  }

  return links;
}

// Search from the polygon p for a route to the 
// end of the current path.

var walk = function( p ) {
  // Centre of touched polygon p.
  var pMean = polygonMiddle( polygons[ p ] );
  // How far are we prepared to walk.
  // This is as-the-crow-flies.
  var distance = 100 * dpr;
  // How far are we prepared to back up our path.
  var backUpDistance = distance * 2.0;

  var links = explore( p, function( q ){ 
    // Function stops exploration.
    var qMean = polygonMiddle( polygons[ q ] );
    // Too far?
    if( dist( pMean, qMean ) > distance ) 
      return false;
    // Ok.
    return true;
  });


  var index = -1;
  var d = 0;
  var minDistance = 1e99;

  // Try and find the point where we join the current path.
  for( var i = path.length - 1; i >= 0; --i ) {
    var q = path[ i ];
    if( q in links ) {
      index = i;
      lastDistance = d;
      minDistance = Math.min( minDistance, d );
    }
    var iMean = polygonMiddle( polygons[ path[ i ] ] );
    d += dist( pMean, iMean );
  }

  // We don't reach the path.
  if( index < 0 )
    return false;

  // We would chop too much off the path.
  if( minDistance > backUpDistance )
    return false;

  // Cut the remainder off the end of the current path.
  path = path.slice( 0, index + 1 );

  var q = path[ path.length - 1 ];

  q = links[ q ]; 

  // Walk from there back to p.
  while( q != -1 ) {
    path.push( q );
    q = links[ q ]; 
  }

  return true;
}


var findPolygonTouched = function( t ) {
  var scale = 1;

  var point = [ ( t[0] - halfDimensions[0] ) / scale, ( t[1] - halfDimensions[1] ) / scale ];

  var x = [ Math.floor( point[ 0 ] / binScale ),
            Math.floor( point[ 1 ] / binScale ) ];

  if( x in polygonBins ) {
    var bin = polygonBins[ x ];

    for( var i = 0; i < bin.length; ++i ) {
      var p = bin[ i ];
      if( polygonContains( point, p ) ) {
        return p;
      }
    }
  }

  return -1;
}


var playing = function() {
  return waiting == 0 && ready == 0 && complete == 0 && fail == 0 && settings == 0 && menu == 0;
}


var touchFeedback = function() {
  // Haptic buzzer on iPad.
  // window.location = "maze://buzzz";
  var now = (new Date).getTime();
  feedback = now;
}


var touchPath = function( t ) {
  // Only when game is playing.
  if( !playing() ) 
    return;

  var p = findPolygonTouched( t );

  if( p == lastTouched )
    return;

  lastTouched = p;

  var changed = false;
  if( p != -1 ) {
    var index = path.indexOf( p );
    if( index == -1 )
    {
      // Not on current path.
      // Try to link path to p.
      changed = walk( p );
      if( !changed ) {
        touchFeedback();
      }
    }
    else if( index == path.length - 2 )
    {
      // Backing up one polygon.
      path.pop();
      changed = true;
    }
    else
    {
      // Somewhere on current path.
    }
  }

  if( changed ) {
    finished();
    refreshPath( ctx1, 1.0 );
  }
}


// When starting a drag allow the user to trim back the path.

var touchPathStart = function( t ) {
  // Only when game is playing.
  if( !playing() ) 
    alert("Error!");

  var p = findPolygonTouched( t );
  lastTouched = p;
  var changed = false;
  if( p != -1 ) {
    var index = path.indexOf( p );
    if( index == -1 )
    {
      changed = walk( p );
      if( !changed ) {
        touchFeedback();
      }
    } else if( index != path.length - 1 ) {
      // If the polygon is already in the path, and not the last item,
      // trim the path back.
      path.splice( index + 1 );
      changed = true;
    }
  }

  if( changed ) {
    finished();
    refreshPath( ctx2, 1.0 );
  }
}

// Searches for a untried level.
// Will not pick the last level.

var setLevel = function( level ) {
  // Set level.
  state.level = level;
  // Save new state.
  save();
  // Refresh screen.
  redraw();
}

var calculateStats = function() {
  return { best: 0, percentage: 0 };
};


var finished = function() {
  // Are we at the end?
  if( endPolygon == path[ path.length - 1 ] && complete == 0 ) {
    var remainingTime = levelTime - elapsedTime;

    // Record the score for animation purposes.
    lastScore = state.score;
    lastElapsedTime = elapsedTime;

    state.score += Math.floor( remainingTime / ( 1000 * dot ) ) + 1;

    // Jump ahead by number of seconds remaining.
    setLevel( state.level + 1 );
    // Complete!
    complete = completeTime;
    // Stop music, if required.
    hojosita.pause();
    redraw();
  }
}

var expired = function() {
  // Work out how far we are from the end of the maze.
  var links = explore( endPolygon, function( q ){ return true; } );

  var dist = function( p ){
    if( p == -1 )
      return 0;
    else
      return dist( links[ p ] ) + 1;
  };

  var startDist = dist( startPolygon ) + 0.0;
  var pathDist = dist( path[ path.length - 1 ] );
  
  var penalty = Math.floor( pathDist / startDist * levelPenalty + 0.5 );

  // Reset level number.
  setLevel( 0 );
  
  fail = failTime;
  redraw();
}

var calculateMazeDimensions = function() {
  var big = 1e6;
  var lower = [ big, big ];
  var upper = [ -big, -big ];
  var n = vertices.length;

  for( var i = 0; i < n; ++i ) {
    var u = vertices[ i ];
    lower[0] = Math.min( u[0], lower[0] );
    lower[1] = Math.min( u[1], lower[1] );
    upper[0] = Math.max( u[0], upper[0] );
    upper[1] = Math.max( u[1], upper[1] );
  };

  var dimensions = [ upper[0] - lower[0], upper[1] - lower[1] ];
  return dimensions;
};

var polygonMiddle = function( polygon ) {
  var mean = [0,0];
    
  for( var v = 0; v < polygon.length; ++v )
  {
    var point = vertices[ polygon[ v ] ];
    mean = add( point, mean );
  }

  mean = div( mean, polygon.length + 0.0 );

  return mean;
}

// The average radius of the polygon.

var polygonRadius = function( polygon, mean ) {
  var r = 0;
    
  for( var v = 0; v < polygon.length; ++v )
  {
    var point = vertices[ polygon[ v ] ];
    r += dist( point, mean );
  }

  return r / polygon.length;
}


var clearCanvas = function( ctx ) { 
  ctx.clearRect( 0, 0, canvasDimensions[0], canvasDimensions[ 1 ] );
}

var drawBackground = function( ctx, scale ) {
/* 
  var r = len( halfDimensions );
  
  var a = -Math.PI / 2;
  var b = elapsedTime * 2 * Math.PI / levelTime - Math.PI / 2;
  
  ctx.fillStyle = darkBackground;
  ctx.beginPath();
  ctx.moveTo( halfDimensions[0], halfDimensions[1] );
  ctx.arc( halfDimensions[0], halfDimensions[1], r, a, b, false );
  ctx.fill();
*/ 
}

// For drawing the in or out point for the polygon.
// Averages the vertices on the perimeter of the maze for 
// the polygon p.

var gress = function( p, first ) {
  // The outside edge or edges for the maze exit.
  var edges = [];
  for( var e = 0; e < perimeter.length; ++e )
  {
    var edge = perimeter[ e ];
    if( edge.p == p )
    {
      edges.push( edge );
      // If we want to pick just one edge.
      if( first ) 
        break;
    }
  }

  if( edges.length > 0 ) {
    var m = [0,0];
      
    for( var i = 0; i < edges.length; ++i )
    {
      m = add( m, vertices[ edges[ i ][ 0 ] ] );
      m = add( m, vertices[ edges[ i ][ 1 ] ] );
    }

    m = div( m, edges.length * 2.0 );
    return m;
  }
}

// A path direction for the polygon.

var arbitraryDirection = function( p ) {
  var d = polygonDual( p );
  if( d.length )
  {
    var q = otherPolygon( dual[ d[ 0 ] ], p );

    var meanP = polygonMiddle( polygons[ p ] );
    var meanQ = polygonMiddle( polygons[ q ] );
    return norm( sub( meanP, meanQ ) );
  }

}

// Pre-process perimeter for faster drawing.

var sortPerimeter = function() {
  // The next vertex in the perimeter.
  var perimeterCache = {};
  // Any vertices that are on the exit polygon.
  var endVertices = {};

  for( var e = 0; e < perimeter.length; ++e )
  {
    var edge = perimeter[ e ];
    if( edge[0] in perimeterCache ) {
      console.log("Branch in perimeter?");
    } else {
      perimeterCache[ edge[0] ] = edge[1];
    }
    if( edge.p == endPolygon )
    {
      endVertices[ edge[0] ] = true;
      endVertices[ edge[1] ] = true;
    }
  }

  var start = perimeter[0][0];
  sortedPerimeter = [];
  sortedPerimeter.push( start );
  var i = perimeterCache[ start ];
  while( i != start ) {
    sortedPerimeter.push( i );
    if( i in perimeterCache ) {
      i = perimeterCache[i];
    } else {
      console.log("Perimeter error?");
      break;
    }
  }

  sortedPerimeterStart = 0;
  sortedPerimeterEnd = 0;
  var isExit = sortedPerimeter[0] in endVertices;
  for( var i = 1; i < sortedPerimeter.length; ++i ) { 
    var e = sortedPerimeter[i] in endVertices;
    if( e != isExit ) {
      if( e ) {
        sortedPerimeterEnd = i;
      } else {
        sortedPerimeterStart = i;
      }
    }
    isExit = e;
  }

  sortedPerimeterStart = ( sortedPerimeterStart + sortedPerimeter.length - 1 ) % sortedPerimeter.length;
  sortedPerimeterEnd = ( sortedPerimeterEnd + 1 ) % sortedPerimeter.length;
}

var reverse = function( v ) {
  var r = [];
  for( var i = 0; i < v.length; ++i ) {
    r[ v.length - i - 1 ] = v[ i ];
  }
  return r;
}

var sortWalls = function() {
  sortedWalls = [];
  // The next vertices in the network of walls.
  // Both directions are listed.
  var wallConnecivity = {};

  // Set of all the walls.
  // Each element contains itself as the container stringifies the key.
  var wallCache = {};

  for( var e = 0; e < walls.length; ++e )
  {
    var w = walls[ e ];
    if( w == undefined )
    {
      alert("!");
    }
    var edge = [ walls[ e ][ 0 ], walls[ e ][ 1 ] ];
    if( edge in wallCache ) {
      console.log("Wall error.");
    } else {
      wallCache[ edge ] = edge;
    }
    var a = edge[0];
    var b = edge[1];

    if( ! ( a in wallConnecivity ) ) {
      wallConnecivity[ a ] = [];
    }
    
    if( ! ( b in wallConnecivity ) ) {
      wallConnecivity[ b ] = [];
    }

    wallConnecivity[ a ].push( b );
    wallConnecivity[ b ].push( a );
  }

  
  while( Object.keys( wallCache ).length ) {
    // Pick anything from cache.
    var wall = wallCache[ Object.keys( wallCache )[ 0 ] ];
    var chain = [ wall[ 0 ], wall[ 1 ] ];
    delete wallCache[ wall ];
    var follow = function(){
      var c = chain[ chain.length - 1 ];
      while( c ) {
        var links = wallConnecivity[ c ];
        var d = undefined;
        for( var i = 0; i < links.length; ++i ) {
          var w = [ c, links[ i ] ];
          if( w[0] > w[1] ) {
            w = swap( w );
          }
          if( w in wallCache ) {
            d = links[i];
            chain.push( d );
            delete wallCache[ w ];
            break;
          }
        }
        c = d;
      }
    }
    follow();
    chain = reverse( chain );
    follow();
    sortedWalls.push( chain );
  }
}

var groupWalls = function() {
  groupedWalls = {};

  for( var e = 0; e < walls.length; ++e )
  {
    var wall = walls[ e ];
    if( !( wall.p in groupedWalls ) ) {
      groupedWalls[ wall.p ] = [];
    }
    if( !( wall.q in groupedWalls ) ) {
      groupedWalls[ wall.q ] = [];
    }

    var edge = [ wall[ 0 ], wall[ 1 ] ];
    if( groupedWalls[ wall.p ].indexOf( edge ) == -1 ) {
      groupedWalls[ wall.p ].push( edge );
    }
    if( groupedWalls[ wall.q ].indexOf( edge ) == -1 ) {
      groupedWalls[ wall.q ].push( edge );
    }
  }
}

var groupPerimeter = function() {
  groupedPerimeter = {};

  for( var i = 0; i < perimeter.length; ++i )
  {
    var e = perimeter[ i ];
    if( !( e.p in groupedPerimeter ) ) {
      groupedPerimeter[ e.p ] = [];
    }

    var edge = [ e[ 0 ], e[ 1 ] ];
    if( groupedPerimeter[ e.p ].indexOf( edge ) == -1 ) {
      groupedPerimeter[ e.p ].push( edge );
    }
  }
}

var drawPolygons = function( ctx, scale ) {

  var drawFinishOutline = false;
  // Draw oversized finish polygon.
  if( drawFinishOutline && endPolygon != -1 )
  {
    var polygon = polygons[ endPolygon ];
    var massive = 1.5;

    var mean = polygonMiddle( polygon );

    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    var start = add( mult( sub( vertices[ polygon[0] ], mean ), massive ), mean );
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = add( mult( sub( vertices[ polygon[v] ], mean ), massive ), mean );
      ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.fill();
  }

  var drawExitArrow = true;
  // Show an arrow pointing out of the maze.
  if( drawExitArrow && endPolygon != -1 )
  {
    // The arrow is drawn pointing out of the maze at the 
    // finish.  We work out the exit direction by averaging the vertices of 
    // the perimeter for the exit polygon.
    // The put the arrow a fixed distance in this direction from the middle of the 
    // exit polygon.
    var polygon = polygons[ endPolygon ];
    var mean = polygonMiddle( polygon );
    var r = polygonRadius( polygon, mean );
    // Arrow size.
    var a = 6;

    var m = gress( endPolygon );

    if( m ) {
       // Direction from polygon to arrow.
      var d = norm( sub( m, mean ) );
      // Position of arrow.
      // It is the radius and a bit along the arrow direction.
      var x = add( mean, mult( d, r + a * dpr ) );
      // Perpendicular.
      var p = perpendicular( d );
      var n = mult( p, -1.0 );
      // Shape of arrow.
      // 5 deep units, 14 across.
      var t0 = add( x, mult( d, 0 * a * dpr ) );
      var t1 = add( x, mult( d, 5 * a * dpr ) );
      var t2 = add( x, mult( p, 7 * a * dpr ) );
      var t3 = add( x, mult( n, 7 * a * dpr ) );

      ctx.fillStyle = palette.highlight;
      ctx.beginPath();
      ctx.moveTo( t0[0] * scale + halfDimensions[0], t0[1] * scale + halfDimensions[1] );
      ctx.lineTo( t2[0] * scale + halfDimensions[0], t2[1] * scale + halfDimensions[1] );
      ctx.lineTo( t1[0] * scale + halfDimensions[0], t1[1] * scale + halfDimensions[1] );
      ctx.lineTo( t3[0] * scale + halfDimensions[0], t3[1] * scale + halfDimensions[1] );
      ctx.closePath();
      ctx.fill();
   }

  }


  var drawStartArrow = false;
  // Show an arrow pointing out of the maze.
  if( drawStartArrow && startPolygon != -1 )
  {
    var polygon = polygons[ startPolygon ];
    var mean = polygonMiddle( polygon );

    var m = gress( startPolygon );

    if( m ) {
       // Direction from polygon to arrow.
      var d = norm( sub( m, mean ) );
      // Position of arrow.
      var x = add( mean, mult( d, 65 * dpr ) );
      // Perpendicular.
      var p = perpendicular( d );
      var n = mult( p, -1.0 );
      var t1 = add( x, mult( mult( d, -1 ), 25 * dpr ) );
      var t2 = add( x, mult( p, 35 * dpr ) );
      var t3 = add( x, mult( n, 35 * dpr ) );

      ctx.fillStyle = palette.highlight;
      ctx.beginPath();
      ctx.moveTo( t2[0] * scale + halfDimensions[0], t2[1] * scale + halfDimensions[1] );
      ctx.lineTo( t1[0] * scale + halfDimensions[0], t1[1] * scale + halfDimensions[1] );
      ctx.lineTo( t3[0] * scale + halfDimensions[0], t3[1] * scale + halfDimensions[1] );
      ctx.closePath();
      ctx.fill();
   }
  }

  var drawPolygons = false;
  if( drawPolygons ) {
    ctx.fillStyle = palette.primary;
    for( var p = 0; p < polygons.length; ++p )
    {
      var polygon = polygons[p];
      ctx.beginPath();
      var start = vertices[ polygon[0] ];
      ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
      for( var v = 0; v < polygon.length; ++v )
      {
        var point = vertices[ polygon[ v ] ];
        ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
      }
      ctx.closePath();
      ctx.fill();

      var indexLabels = false;
      if( indexLabels )
      {
        ctx.fillStyle = '#dddddd';
        ctx.font="20px " + font;
        for( var v = 0; v < polygon.length; ++v )
        {
          var point = vertices[ polygon[ v ] ];
          ctx.fillText( v.toString(), point[0] * scale + halfDimensions[0] + 5, point[1] * scale + halfDimensions[1] + 5 );
        }
      }
    }
  }

  var drawPerimeter = true;
  if( drawPerimeter ) {
    // Disabled for performance, for now.
    var gradient = false;
    if( gradient ) {
      var gradient = ctx.createRadialGradient( 
          halfDimensions[0] * 0.7, 
          halfDimensions[1] * 0.7,
          halfDimensions[0] * 0.3,

          halfDimensions[0] * 1.2, 
          halfDimensions[1] * 1.2,
          halfDimensions[0] * 2.5
          );
      gradient.addColorStop( 1.0, palette.primary );
      gradient.addColorStop( 0.0, palette.base )
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = palette.primary;
    }


    // Draw polygon for entire background of maze.
    ctx.beginPath();
    var start = vertices[ sortedPerimeter[ 0 ] ];
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var i = 0; i < sortedPerimeter.length; ++i )
    {
      var next = vertices[ sortedPerimeter[ i ] ];
      ctx.lineTo( next[0] * scale + halfDimensions[0], next[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.fill();
    
  }

  var drawUnreachablePolygons = true;
  if( drawUnreachablePolygons ) {
    ctx.fillStyle = palette.secondary;
    for( var p = 0; p < polygons.length; ++p )
    {
      if( p in reachable )
        continue;

      var polygon = polygons[p];
      ctx.beginPath();
      var start = vertices[ polygon[0] ];
      ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
      for( var v = 0; v < polygon.length; ++v )
      {
        var point = vertices[ polygon[ v ] ];
        ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
      }
      ctx.closePath();
      ctx.fill();

      var indexLabels = false;
      if( indexLabels )
      {
        ctx.fillStyle = '#dddddd';
        ctx.font="20px " + font;
        for( var v = 0; v < polygon.length; ++v )
        {
          var point = vertices[ polygon[ v ] ];
          ctx.fillText( v.toString(), point[0] * scale + halfDimensions[0] + 5, point[1] * scale + halfDimensions[1] + 5 );
        }
      }
    }
  }

}

var drawPath = function( ctx, scale ) {
  ctx.fillStyle = palette.highlight;
  for( var p = 0; p < path.length; ++p )
  {
    var polygon = polygons[ path[ p ] ];
    ctx.beginPath();
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.fill();
  }
}

var drawSolution = function( ctx, scale ) {
  // Draw the solution, animating it.
  // This is a hint to players.
  if( state.level == 0 ) {
    // Animation repeats every 8 seconds.
    var e = elapsedTime % 8000;
    // Delay animation by 2 seconds.
    var itemA = Math.min( Math.floor( ( e - 2000 ) / 50 ), solution.length );
    // Fade out items over half a second.
    var itemB = Math.max( 0, Math.floor( ( e - 2500 ) / 50 ) );
    // Not started yet.
    if( itemA < 0 ) return;
    // Finished for now.
    if( itemB >= solution.length ) return;

    var draw = function( fade ) {
      for( var i = itemB; i < itemA; ++i ) {
        var p = solution[ i ];

        if( path.indexOf( p ) != -1 ) continue;

        var polygon = polygons[ p ];

        var smaller = 0.7;

        if( fade ) {
          ctx.globalAlpha = ( i - itemB ) / ( itemA - itemB );
          ctx.globalAlpha *= ( ( solution.length - i ) / solution.length );
        }
        else
        {
          // Grow polygon a little when drawing the background.
          // Otherwise anti-aliasing artefacts can be left behind.
          smaller = 0.8;
        }

        var mean = polygonMiddle( polygon );

        ctx.beginPath();
        var start = add( mult( sub( vertices[ polygon[0] ], mean ), smaller ), mean );
        ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
        for( var v = 0; v < polygon.length; ++v )
        {
          var point = add( mult( sub( vertices[ polygon[v] ], mean ), smaller ), mean );
          ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
        }

        /*
        var r = scale * dpr * 5;
         
        drawCircle( ctx, mean[0] * scale + halfDimensions[0], 
                         mean[1] * scale + halfDimensions[1], r );
        */
        ctx.closePath();
        ctx.fill();
      }
    };

    // Clear.
    ctx.fillStyle = palette.primary;
    draw();

    // Draw fade.
    ctx.fillStyle = "#ffffff";
    draw( true );

    ctx.globalAlpha = 1.0;
  }
}

var drawFeedback = function( ctx, scale ) {
  // Flash the path if required.
  var now = (new Date).getTime();

  if( now - feedback < feedbackTime ) {
    // Trim the last little bit off the path, to only 
    // show feedback effect for that bit.
    var highlight = lastPath.slice( -10 );

    // Draw shaded polygons. 
    for( var p = 0; p < highlight.length; ++p )
    {
      var v = ( 1.0 * p ) / highlight.length;
      var u = 1.0 - ( now - feedback ) / feedbackTime;
      ctx.fillStyle = darken( palette.highlight, v * u );
      var polygon = polygons[ highlight[ p ] ];
      ctx.beginPath();
      var start = vertices[ polygon[0] ];
      ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
      for( var v = 0; v < polygon.length; ++v )
      {
        var point = vertices[ polygon[ v ] ];
        ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
      }
      ctx.closePath();
      ctx.fill();
    }

    // Draw any walls required.
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 4.0 * scale;
    ctx.beginPath();
    for( var p = 0; p < highlight.length; ++p )
    {
      if( highlight[ p ] in groupedWalls ) {
        var w = groupedWalls[ highlight[ p ] ];
        for( var e = 0; e < w.length; ++e )
        {
          var edge = w[ e ];
          var start = vertices[ edge[ 0 ] ];
          ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
          var end = vertices[ edge[ 1 ] ];
          ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
        }
      }
    }
    ctx.stroke();

    // Draw any perimeter required.
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 6.0 * scale;
    ctx.beginPath();
    for( var p = 0; p < highlight.length; ++p )
    {
      if( highlight[ p ] in groupedPerimeter )
      {
        var w = groupedPerimeter[ highlight[ p ] ];
        for( var e = 0; e < w.length; ++e ) 
        {
          var edge = w[ e ];
          var start = vertices[ edge[ 0 ] ];
          ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
          var end = vertices[ edge[ 1 ] ];
          ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
        }
      }
    }
    ctx.stroke(); 
    
  
  
  }





}

var drawWalls = function( ctx, scale ) {
  var drawPerimeterByEdge = false;
  if( drawPerimeterByEdge ) {
    // The perimeter.
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 6.0 * scale;
    ctx.beginPath();
    for( var e = 0; e < perimeter.length; ++e )
    {
      var edge = perimeter[ e ];
      if( edge.p != endPolygon )
      {
        var start = vertices[ edge[ 0 ] ];
        ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
        var end = vertices[ edge[ 1 ] ];
        ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
      }
    }
    ctx.stroke();
  }


  var drawPerimeter = true;
  if( drawPerimeter ) {
    // The perimeter.
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 6.0 * scale;
    ctx.beginPath();
    var start = vertices[ sortedPerimeter[ sortedPerimeterStart ] ];
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var i = ( sortedPerimeterStart + 1 ) % sortedPerimeter.length; 
         i != sortedPerimeterEnd; 
         i = ( i + 1 ) % sortedPerimeter.length ) {
      var next = vertices[ sortedPerimeter[ i ] ];
      ctx.lineTo( next[0] * scale + halfDimensions[0], next[1] * scale + halfDimensions[1] );
    }
    ctx.stroke();
  }


  // Walls.
  var drawWallsOneByOne = false;
  if( drawWallsOneByOne ) {
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 4.0 * scale;
    ctx.beginPath();
    for( var e = 0; e < walls.length; ++e )
    {
      var edge = walls[ e ];
      var start = vertices[ edge[ 0 ] ];
      ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
      var end = vertices[ edge[ 1 ] ];
      ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
    }
    ctx.stroke();
  }

  var drawWalls = true;
  if( drawWalls ) {
    ctx.lineCap = "round";
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 4.0 * scale;
    ctx.beginPath();
    for( var c = 0; c < sortedWalls.length; ++c ) { 
      var chain = sortedWalls[ c ];

      var start = vertices[ chain[ 0 ] ];
      ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
      for( var i = 1; i < chain.length; ++i ) {

        var next = vertices[ chain[ i ] ];
        ctx.lineTo( next[0] * scale + halfDimensions[0], next[1] * scale + halfDimensions[1] );
      }
    }
    ctx.stroke();
  }

  // Look for actual setting for this.
  // I did 'lineCap round'.
  var capWalls = false;
  if( capWalls ) {
    var r = 4.0 * scale / 2;
    ctx.fillStyle = palette.dark;
    for( var c = 0; c < sortedWalls.length; ++c ) { 
      var chain = sortedWalls[ c ];

      var start = vertices[ chain[ 0 ] ];
      ctx.beginPath();
      ctx.moveTo( halfDimensions[0] + start[0] * scale, 
                  halfDimensions[1] + start[1] * scale );
      ctx.arc( halfDimensions[0] + start[0] * scale, 
               halfDimensions[1] + start[1] * scale, r, 0, 2 * Math.PI, false );
      ctx.fill();
      var end = vertices[ chain[ chain.length - 1 ] ];
      ctx.beginPath();
      ctx.moveTo( halfDimensions[0] + end[0] * scale, 
                  halfDimensions[1] + end[1] * scale );
      ctx.arc( halfDimensions[0] + end[0] * scale, 
               halfDimensions[1] + end[1] * scale, r, 0, 2 * Math.PI, false );
      ctx.fill();
    }


  }


}

var drawDebug = function( ctx, scale ) {
 
  var levelLabel = true;
  if( levelLabel )
  {
    ctx.fillStyle = '#dddddd';
    ctx.font="20px " + font;
    ctx.textAlign="left"; 
    ctx.fillText( state.level.toString(), 55, 50 );
    ctx.fillText( Math.round( levelScore.toString() ), 55, 100 );
    ctx.fillText( navigator.userAgent, 55, 200 );
    ctx.fillText( navigator.platform, 55, 250 );
    /*
    ctx.fillText( dpr, 55, 300 );
    ctx.fillText( canvasDimensions, 55, 350 );
    ctx.fillText( displayDimensions, 55, 400 );
    ctx.fillText( mazeDimensions, 55, 450 );
    */
  }

  // The dual is the paths between the polygons.
  var drawDual = true;
  if( drawDual ) {

    for( var d = 0; d < dual.length; ++d ) {
      var mp = polygonMiddle( polygons[ dual[d].p ] );
      var mq = polygonMiddle( polygons[ dual[d].q ] );
      
      ctx.strokeStyle = palette.dark;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo( mp[0] * scale + halfDimensions[0], mp[1] * scale + halfDimensions[1] );
      ctx.lineTo( mq[0] * scale + halfDimensions[0], mq[1] * scale + halfDimensions[1] );
      ctx.stroke();
    }
  }

  var drawLastTouched = false;
  if( drawLastTouched && lastTouched != -1 ) {

    var polygon = polygons[ lastTouched ];
    // Is the polygon in the current path.
    ctx.strokeStyle = palette.highlight;
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.stroke();

  }
}

var drawOverlay = function( ctx, scale ) {
  // Timer clock.
  /*
  var n = 50;
  var m = n * 1.0 * elapsedTime / levelTime;
  var r = 50;
  ctx.strokeStyle = "#dddddd";;
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.moveTo( Math.cos( 0 ) * r + halfDimensions[0], Math.sin( 0 ) * r + halfDimensions[1] );
  for( var i = 1; i < Math.floor( m ); ++i ) {
    var u = i * Math.PI * 2 / n;
    ctx.lineTo( Math.cos( u ) * r + halfDimensions[0], Math.sin( u ) * r + halfDimensions[1] );
  }
  var u = m * Math.PI * 2 / n;
  ctx.lineTo( Math.cos( u ) * r + halfDimensions[0], Math.sin( u ) * r + halfDimensions[1] );
  ctx.stroke();
  */


  var dark = "#666666";
  ctx.fillStyle = dark;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.0 * scale;

  // Calculations in seconds.
  var total = levelTime / ( 1000 * dot ); 

  var elapsed = elapsedTime / ( 1000 * dot ); 

  var spacing = canvasDimensions[ 0 ] / 20;

  var f = 1.0 - ( transition / transitionTime );

  var remaining = total - elapsed;
  var remainder = 0;

  if( transition > 0 )
  {
    var o = ( total - elapsed ) * ( 1.0 - f );
    remaining = Math.floor( o );
    remainder = o - remaining;
  }

  ctx.font= Math.floor( spacing ) + "px " + font;

  ctx.clearRect( 0, 0, canvasDimensions[0], spacing * 2 );

  var r = spacing * 0.3;
  var n = Math.floor( remaining );

  for( var i = 0; i < n; ++i )
  {
    var x = spacing * i + spacing;
    if( i == n - 1 && transition > 0 )
    {
      // Send the last dot whizzing across the screen.
      x += spacing / remainder - spacing;
      // And fading out.
      ctx.globalAlpha = remainder;
    }
    ctx.beginPath();
    ctx.arc( x, spacing, r, 0, 2.0 * Math.PI );
    ctx.fill();
  }

  // Circle for current dot.
  // Fades out over last second.

  var a = remaining - n;

  if( a * dot < 1 )
  {
    var b = ( a * dot ) % 1.0;
    ctx.globalAlpha = b;
  }

  ctx.beginPath();
  ctx.arc( spacing * i + spacing, spacing, r, 0, 2.0 * Math.PI );
  ctx.fill();

  // Rings indicate a count down. 

  var a = remaining - n;

  if( a * dot < 3 )
  {
    var b = ( a * dot ) % 1.0;
    ctx.globalAlpha = b;
    ctx.beginPath();
    ctx.arc( spacing * i + spacing, spacing, r + r * b, 0, 2.0 * Math.PI );
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  var s = state.score;

  if( transition > 0 )
  {
    // Between levels we count up the additional score.
    s = Math.floor( ( state.score - lastScore ) * f - 0.5 ) + lastScore;
    s = state.score - remaining;
  }

  ctx.font= Math.floor( spacing ) + "px " + font;
  ctx.textAlign="right"; 
  ctx.fillText( s.toString(), canvasDimensions[ 0 ] - spacing, spacing + r );
}




var drawWaiting = function( ctx, scale ) {
  var text = ( state.level + 1 ).toString();
  var fontSize = 100;

  if( state.level == 0 ) {
    text = "Go";
    fontSize = 70;
  }

  var r = textButtonRadius( ctx, text, fontSize, scale );
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 3.0;

  // Animated pulses.
  for( i = 0; i < 3; ++i ) {
    var a = ( i - 2 ) * ( r / 4 ) + waiting / 10;
    var b = 1.0 - a / ( r / 2 );
    if( b < 0.0 || b > 1.0 ) continue;

    ctx.globalAlpha = b;
    drawCircle( ctx, halfDimensions[0], halfDimensions[1], r + a );
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // To get number. 
  drawReady( ctx, scale );

  settingsButton.draw( ctx, scale );
}


var drawReady = function( ctx, scale ) {
  // Bail if font is missing.
  // Probably just not loaded yet.
  if( !isFontReady( ctx, font ) )
    return;
  
  // Show level number 1-based.
  var text = ( state.level + 1 ).toString();
  var fontSize = 100;

  if( state.level == 0 ) {
    text = "Go";
    fontSize = 70;
  }

  ctx.font= fontSize + "px " + font + " ,monospace";
  
  var r = textButtonRadius( ctx, text, fontSize, scale );
  var h = '#dddddd';

  // Highlight button if we are waiting and it has been pushed.
  if( waiting > 0 && 
      touch && 
      dist( touch, halfDimensions ) < r )
    h = '#ffffff';

  ctx.strokeStyle = h;
  ctx.fillStyle = '#999999';
  ctx.lineWidth = 3.0;

  drawCircle( ctx, halfDimensions[0], halfDimensions[1], r );
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = h;
  ctx.textAlign="center"; 
  ctx.textBaseline="middle"; 
  ctx.fillText( text, halfDimensions[0], halfDimensions[1] );

}

// Stage Selection Menu

var drawMenu = function( ctx, scale ) {
  // Bail if font is missing.
  // Probably just not loaded yet.
  if( !isFontReady( ctx, font ) )
    return;

  var h = Math.floor( halfDimensions[0] / 4 );

  ctx.font = h + "px " + font + " ,monospace";
  
  ctx.textAlign="center"; 
  ctx.textBaseline="middle";

  var r = textButtonRadius( ctx, "99", h, scale );

  // Diameter and 0.7 r between.
  var spacing = r * 2.7;
  // The number of stages to draw before middle stage.
  var n = Math.floor( halfDimensions[0] / spacing );
  // Offset to stage number due to dragging.
  var m = Math.floor( menuDrag[0] / spacing + 0.5 );
  // Remainder offset in pixels.
  var d = menuDrag[0] - m * spacing;

  // Current stage.
  var s = state.stage;

  // First stage to draw.
  var a = s - n - m;
  // Last stage to draw.
  var b = s + n + 1 - m;

  for( var i = a; i <= b; ++i ) {
    if( i < 0 || i >= stages.length )
      continue;
  
    var o = ( i - a );
    ctx.fillStyle = '#999999';
    var x = o * spacing + d;
    var y = halfDimensions[1];

    drawCircle( ctx, x, y, r );
    ctx.fill();

    // Selected is inside the central circle and not dragged too far.
    // Phew.

    if( touch && dist( touch, [x,y] ) < r && 
        Math.abs( menuDrag[0] ) < r * 0.1 && 
        i == s)
      ctx.fillStyle = '#ffffff';
    else
      ctx.fillStyle = '#666666';

    var text = ( i + 1 ).toString();
    ctx.fillText( text, x, y );
  }

  settingsButton.draw( ctx, scale );
}

var drawComplete = function( ctx, scale ) {
  // Count up score.
  
  /*
  ctx.font="100px " + font + " ,monospace";
  
  // Bail if font is missing.
  if( !isFontReady( ctx, font ) )
    return;

  ctx.textAlign="center"; 
  ctx.textBaseline="middle";


  // Numbers fade in and out.
  var fade = 1.0 - ( Math.cos( complete * 2 * Math.PI / completeTime ) + 1.0 ) * 0.5;

  // One second at start and end of animation.
  var c = Math.min( Math.max( 0, ( complete - 1000 ) / ( completeTime * 0.3 ) ), 1.0 );
  // Number line whizzes by.
  var f = ( Math.cos( c * Math.PI ) + 1 ) * 0.5;
  // The current 'level' of the animation.  Not necessarily an integer.
  var l = f * ( state.level - lastLevel ) + lastLevel;

  // Circle radius changes between the two states.
  var rLevel = textButtonRadius( ctx, ( state.level + 1 ).toString(), 100, scale );
  var rLast = textButtonRadius( ctx, ( lastLevel + 1 ).toString(), 100, scale );
  var r = ( rLevel - rLast ) * f + rLast;

  // Central circle.
  ctx.fillStyle = '#999999';
  drawCircle( ctx, halfDimensions[0], halfDimensions[1], r );
  ctx.fill();

  var spacing = r * 1.7;
  var n = Math.floor( halfDimensions[0] / spacing );

  var level = Math.floor( l );

  var a = level - n;
  var b = level + n + 1;

  for( var i = a; i <= b; ++i ) {
    if( i < 0 || i >= levels.length )
      continue;
    var f = fade;
    // When fading levels in and out, make sure we do not fade in the last 
    // level or fade out the current one.
    if( i == lastLevel && complete > completeTime * 0.5 ) f = 1.0;
    if( i == state.level && complete < completeTime * 0.5 ) f = 1.0;
    ctx.fillStyle = 'rgba(230,230,230,'+f+')';
    var o = ( i - a ) - n - ( l - level );
    var text = ( i + 1 ).toString();
    ctx.fillText( text, halfDimensions[0] + o * spacing, halfDimensions[1] );
  }
*/
}

var drawFail = function( ctx, scale ) {
  var proportion = fail / failTime;
  drawExplode( ctx, scale, function( dist ) {
    return Math.max( 0, 1.0 - proportion - dist * 0.2 );
  } );
}

var drawTransition = function( ctx, scale ) {
  /*
  var proportion = transition / transitionTime;
  drawExplode( ctx, scale, function( dist ) {
    return Math.max( 0, proportion - dist * 0.2 );
  } );
  */
  // drawOverlay( ctx3, 1.0 );
}
  
var drawExplode = function( ctx, scale, fun ) {
  seedPseudoRandom( 0 );

  var epicentre = polygonMiddle( polygons[ path[ path.length - 1 ] ] );

  ctx.strokeStyle = palette.dark;

  for( var p = 0; p < polygons.length; ++p )
  {
    var polygon = polygons[p];

    var rot = ( pseudoRandom() - 0.5 ) * 3.14;
    var speed = pseudoRandom() * 2 + 0.5;

    var centre = polygonMiddle( polygon );

    var dist = 1.0 - len( sub( centre, epicentre ) ) / canvasDimensions[0];
    var ripple = fun( dist );
    var factor = ( 1.0 - ripple * ripple );

    var offset = mult( sub( centre, epicentre ), ripple * speed );

    var transform = function( point )
    {
      return add( add( rotate( sub( point, centre ), rot * ripple ), centre ), offset );
    }
   
    // Draw tiles.
    
    if( path.indexOf( p ) == -1 )
      ctx.fillStyle = palette.primary;
    else
      ctx.fillStyle = palette.highlight;

    ctx.beginPath();
    var start = transform( vertices[ polygon[0] ] );

    ctx.moveTo( start[0] * scale + halfDimensions[0], 
        start[1] * scale + halfDimensions[1] );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = transform( vertices[ polygon[ v ] ] );
      ctx.lineTo( point[0] * scale + halfDimensions[0], 
          point[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.fill();

    // Draw walls.

    ctx.lineWidth = 4.0 * scale;
    ctx.beginPath();
    if( p in groupedWalls ) {
      var w = groupedWalls[ p ];
      for( var e = 0; e < w.length; ++e )
      {
        var edge = w[ e ];
        var start = transform( vertices[ edge[ 0 ] ] );
        ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
        var end = transform( vertices[ edge[ 1 ] ] );
        ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
      }
    }
    ctx.stroke();

    // Draw perimeter.

    ctx.lineWidth = 6.0 * scale;
    ctx.beginPath();
    if( p in groupedPerimeter ) {
      var w = groupedPerimeter[ p ];
      for( var e = 0; e < w.length; ++e )
      {
        var edge = w[ e ];
        var start = transform( vertices[ edge[ 0 ] ] );
        ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
        var end = transform( vertices[ edge[ 1 ] ] );
        ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
      }
    }

    ctx.stroke();

  }

}

var refreshPath = function( ctx, scale ) {
  var highlight = [];
  var clear = [];
  var changed = [];
  var i;
  // Skip unchanged sections.
  var n = Math.min( path.length, lastPath.length );
  for( i = 0; i < n; ++i ) {
    if( path[ i ] != lastPath[ i ] ) {
      break;
    }
  }
  // Removed sections. 
  for( var j = i; j < lastPath.length; ++j ) {
    clear.push( lastPath[ j ] );
    changed.push( lastPath[ j ] );
  }
  // New sections.
  for( var j = i; j < path.length; ++j ) {
    highlight.push( path[ j ] );
    changed.push( path[ j ] );
  }

  // Clear polygons. 
  ctx.fillStyle = palette.primary;
  for( var p = 0; p < clear.length; ++p )
  {
    var polygon = polygons[ clear[ p ] ];
    ctx.beginPath();
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.fill();
  }

  // Draw highlighted polygons. 
  ctx.fillStyle = palette.highlight;
  for( var p = 0; p < highlight.length; ++p )
  {
    var polygon = polygons[ highlight[ p ] ];
    ctx.beginPath();
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] * scale + halfDimensions[0], point[1] * scale + halfDimensions[1] );
    }
    ctx.closePath();
    ctx.fill();
  }

  // Draw any walls required.
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 4.0 * scale;
  ctx.beginPath();
  for( var p = 0; p < changed.length; ++p )
  {
    if( changed[ p ] in groupedWalls ) {
      var w = groupedWalls[ changed[ p ] ];
      for( var e = 0; e < w.length; ++e )
      {
        var edge = w[ e ];
        var start = vertices[ edge[ 0 ] ];
        ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
        var end = vertices[ edge[ 1 ] ];
        ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
      }
    }
  }
  ctx.stroke();

  // Draw any perimeter required.
  // The perimeter.
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 6.0 * scale;
  ctx.beginPath();
  for( var p = 0; p < changed.length; ++p )
  {
    if( changed[ p ] == endPolygon )
      continue;

    if( changed[ p ] in groupedPerimeter )
    {
      var w = groupedPerimeter[ changed[ p ] ];
      for( var e = 0; e < w.length; ++e ) 
      {
        var edge = w[ e ];
        var start = vertices[ edge[ 0 ] ];
        ctx.moveTo( start[0] * scale + halfDimensions[0], start[1] * scale + halfDimensions[1] );
        var end = vertices[ edge[ 1 ] ];
        ctx.lineTo( end[0] * scale + halfDimensions[0], end[1] * scale + halfDimensions[1] );
      }
    }

  }
  ctx.stroke();


  lastPath = deepCopyArray( path );
}


var draw = function( ctx, scale ) {

  if( !ctx ) return;
  if( !palette ) return;

  // Layer the polygons, current path and the walls.
  drawPolygons( ctx, scale );
  drawPath( ctx, scale );
  drawWalls( ctx, scale );

  // drawDebug( ctx, scale );
  // The background is updated independently.
}

// Draw the settings page.
var drawSettings = function( ctx, scale ) {
  doneButton.draw( ctx, scale );
  levelLabel.draw( ctx, scale );
  bestLabel.draw( ctx, scale );
  percentLabel.draw( ctx, scale );
  resetButton.draw( ctx, scale );
  muteMusicButton.draw( ctx, scale );
  muteSoundsButton.draw( ctx, scale );
}

// Complete re-draw.
var redraw = function() {
  if( !ctx1 || !ctx2 ) return;

  // Reset any fading effects.
  $("#c1").css( { "opacity" : 1.0 } );
  $("#c2").css( { "opacity" : 1.0 } );

  $("#c1").css( { "transform" : "none" } );
  $("#c2").css( { "transform" : "none" } );


  if( waiting > 0 ) {
    // Context 1 needs painting.
    clearCanvas( ctx2 );
    drawWaiting( ctx2, 1.0 );  
  } else if( menu > 0 ) {
    clearCanvas( ctx2 );
    drawMenu( ctx2, 1.0 );  
    drawOverlay( ctx3 );
  } else if( ready > 0 ) {
    // Pre-game screen.
    fillCanvas( ctx1, background );
    draw( ctx1, 1.0 );
    clearCanvas( ctx2 );
    drawReady( ctx2, 1.0 );  
    drawOverlay( ctx3 );
  } else if( transition > 0 ) {
    // Between level animation.
    $("#c2").css( { "opacity" : 0 } );
    clearCanvas( ctx2 );
    draw( ctx2, 1.0 );
    drawOverlay( ctx3 );
  } else if( complete > 0 ) {
    // Finished-level animation.
    fillCanvas( ctx1, background );
    draw( ctx1, 1.0 );
    clearCanvas( ctx2 );
    drawComplete( ctx2, 1.0 );  
  } else if( fail > 0 ) {
    // Failed-level animation.
    fillCanvas( ctx1, background );
    drawFail( ctx1, 1.0 );
    clearCanvas( ctx2 );
  } else if( settings > 0 ) {
    // Settings screen.
    clearCanvas( ctx2 );
    fillCanvas( ctx2, "rgba( 0,0,0,0.5)" );
    drawSettings( ctx2, 1.0 );
  } else {
    // Playing.
    fillCanvas( ctx1, background );
    draw( ctx1, 1.0 );
    clearCanvas( ctx2 );
    drawOverlay( ctx3 );
  }
}

var loadLevel = function( seed, type ) {

  // Seed by level.
  seedPseudoRandom( seed );

  // Reset maze state.
  vertices = [];
  polygons = [];
  perimeter = [];
  walls = [];
  dual = [];
  lastTouched = -1;

  // The iterations of the refinement algo.
  var refine = 0;
  // Difficulty is the same across devices.
  // Magic number is an appropriate polygon size for mobile.
  // Maze size controlled by length of edge of polygon.
  var s = canvasDimensions[0] * 0.075;
  // Rotation of seed polygon.
  var r = pseudoRandom() * 3.14;
  // Unused option for future features.
  var o = pseudoRandom();


  switch( type ){
  case 0:
    // Square grid.
    addPolygon( 4, 0, 0, s, r );
    var more = true;
    while( more ) {
      more = addToPerimeter( 4 );
    }
    break;
  case 1:
    // Hexagons.
    addPolygon( 6, 0, 0, s, r );
    var more = true;
    while( more ) {
      more = addToPerimeter( 6 );
    }
    break;
  case 2:
    // Triangles.
    addPolygon( 3, 0, 0, s, r );
    var more = true;
    while( more ) {
      more = addToPerimeter( 3 );
    }
    break;
  case 3:
    // Hex + tri.
    addPolygon( 6, 0, 0, s, r );
    var more = true;
    for( var i = 0; i < 4; ++i ) {
      more = more && addToPerimeter( 3 );
      more = more && addToPerimeter( 6 );
    }
    // Doesn't really work.
    // Pattern breaks down when we get to the edge.
    return -1;
  default:
    // For future maze designs.
    return -1;
  }

  mazeDimensions = calculateMazeDimensions();
  binPolygons();
  findStartAndEnd();
  sortPerimeter();
  buildMaze();

  for( var i = 0; i < refine; ++i ) {
    solveMaze();
    pruneMaze();
    findReachable();
    refineMaze();
  }

  // Extra solve required for solution.
  
  solveMaze();
  // Additionally mark these for display.
  findReachable();
  sortWalls();
  groupWalls();
  groupPerimeter();

  // Score both ways.
  // Some mazes may be very easy in reverse.
  var score = Math.min( scoreLevel( startPolygon, endPolygon ),
                        scoreLevel( endPolygon, startPolygon ) );

  startTime = (new Date).getTime();
  lastTime = (new Date).getTime();
  elapsedTime = 0;

  lastPath = [];

  return score;
}

// Work out the solution to the maze.

var solveMaze = function() {
  var visited = {};

  solution = [];

  var explore = function( p, path ) {
    visited[ p ] = true;
    var s = path.concat( [ p ] );
    
    if( p == endPolygon ) {
      solution = s;
    } 

    var w = polygonDual( p );
    for( var k = 0; k < w.length; ++k ) {
      var o = otherPolygon( dual[ w[ k ] ], p );
      if( o in visited ) {
        // Backtracking or cycle.
      } else {
        explore( o, s ); 
      }
    }
  }
 
  explore( startPolygon, [] );

  reachable = visited;
  
  return solution != [];
}

// Find areas of the maze that are unreachable.

var findReachable = function() {
  var visited = {};

  var explore = function( p, path ) {
    visited[ p ] = true;
    var s = path.concat( [ p ] );
    
    var w = polygonDual( p );
    for( var k = 0; k < w.length; ++k ) {
      var o = otherPolygon( dual[ w[ k ] ], p );
      if( o in visited ) {
        // Backtracking or cycle.
      } else {
        explore( o, s ); 
      }
    }
  }
 
  explore( startPolygon, [] );

  reachable = visited;
}



// Level is scored for difficulty.
// Impossible levels are identified and rejected (score -1).
// Levels that are boring are also rejected (score 0).

var scoreLevel = function( start, end ) {
  // Back links take us back to the start.
  var backLinks = {};
  backLinks[ start ] = -1;
  // Forward links let us know what paths are available.
  var forwardLinks = {};
  // March out from the start building up the routes back.
  var queue = [ start ];
 
  while( queue.length > 0 ) {
    // Pop font.
    var q = queue[0];
    queue.splice(0,1);
    // Add neighbours.
    var w = polygonDual( q );
    for( var k = 0; k < w.length; ++k ) {
      var other = otherPolygon( dual[ w[ k ] ], q );
      if(other in backLinks ) {
        // A cycle?
      } else {
        // Record the links.
        backLinks[ other ] = q;
        if( q in forwardLinks ) {
          forwardLinks[ q ].push( other );
        } else {
          forwardLinks[ q ] = [ other ];
        }
        // Add to the items to explore.
        queue.push( other );
      }
    }
  }

  // Pre-compute the middle of the polygons.
  var middle = [];
  for( var p = 0; p < polygons.length; ++p ) {
    middle[ p ] = polygonMiddle( polygons[ p ] );
  }

  // Impossible level.
  var terribleScore = -1;
  // Easy level.
  var badScore = 0;

  // Test that the end is reachable from the start.
  if( !( end in backLinks ) ) {
    // Impossible!
    // console.log( "Impossible!" );
    return terribleScore;
  }

  // Length of solution in steps.
  var steps = 1;
  // Length of solution.
  var distance = 0;
  // Number of wrong paths.
  var junctions = 0;
  // Sum of wrong path length squared times length to finish squared.
  // Favour long wrong paths that branch early.
  var score = 0;
  // Iterator starts search at the finish.
  var i = end;
  // Iterator - 1.
  var j = -1;
  while( i != -1 )
  {
    if( i in backLinks ) {
      if( i in forwardLinks ) {
        for( var b= 0; b < forwardLinks[ i ].length; ++b ) {
          var branch = forwardLinks[ i ][ b ];
          if( branch == i ) {
            // Loop in forward links?
            console.log( "Errr.." );
            continue;
          }
          // We are looking for incorrect branches.
          if( branch == j ) continue;

          junctions++;

          // The deepest path in a sub-tree starting with k.
          var depth = function( k ) {
            var d = 0;
            if( k in forwardLinks ) {
              for( var l = 0; l < forwardLinks[ k ].length; ++l ) {
                var j = forwardLinks[ k ][ l ];
                d = Math.max( d, depth( j ) + 
                                 dist( middle[ k ], middle[ j ] ) );
              }
            }
            return d;
          };


          var d = depth( branch ) + dist( middle[ i ], middle[ branch ] );
          // The length of the wrong path * the length of the correct path from
          // the junction.
          // The theory is long branches close to the exit are not interesting.
          score += Math.pow( d * distance, 2 );
          //console.log( "Depth: " + d, "Distance: " + distance );
        }
      }
      // Advance towards start.
      j = i;
      i = backLinks[ i ];
      if( i != -1 )
      {
        distance += dist( middle[ i ], middle[ j ] );
      }
      steps++;
    } else {
      // Error!
      console.log( "Error!" );
      return terribleScore;
    }
  }

  // Is the solution too direct to be interesting?
  var mazeDiagonal = Math.sqrt( mazeDimensions[ 0 ] * mazeDimensions[ 0 ] +
                                mazeDimensions[ 1 ] * mazeDimensions[ 1 ] );

  // Just assuming the path is much longer than the length of the diagonal.
  if( distance < mazeDiagonal * 1.5 ){
    return badScore;
  }

  //console.log( "Steps: " + steps );
  //console.log( "Junctions: " + junctions );
  //console.log( "Distance: " + distance );
  //console.log( "Score: " + score );

  return Math.sqrt( score );
}

var advanceGame = function() {
  
  var now = (new Date).getTime();
  var step = now - lastTime;

  elapsedTime = now - startTime;
 
  var remainingTime = levelTime - elapsedTime;
  if( remainingTime <= 0 ) {
    expired();
  }
  else
  {
    if( remainingTime / 1000.0 < hojosita.duration && 
        hojosita.paused && 
        !hojosita.mute ) {
      fadeIn( hojosita, 10 );
    }

    // We only need to update the background when updating the timer.
    //drawBackground( ctx1, 1.0 );
    drawOverlay( ctx3, 1.0 );

    drawSolution( ctx1, 1.0 );

    drawFeedback( ctx1, 1.0 );

    lastTime = now;
  }
}

var advanceWaiting = function() {
  var now = (new Date).getTime();
  var step = now - lastTime;

  waiting -= step;

  while( waiting <= 0 )
  {
    waiting += waitingTime;
  }

  clearCanvas( ctx2 );
  drawWaiting( ctx2, 1.0 );  

  lastTime = now;
}

var advanceMenu = function() {
  var now = (new Date).getTime();
  var step = now - lastTime;

  menu -= step;

  while( menu <= 0 )
  {
    menu += menuTime;
  }

  // Animate 'snap'
  if( menuDragStart == undefined ) 
    menuDrag = mult( menuDrag, 0.9 );

  clearCanvas( ctx2 );
  drawMenu( ctx2, 1.0 );  

  lastTime = now;
}

var advanceReady = function() {
  
  var now = (new Date).getTime();
  var step = now - lastTime;

  ready = Math.max( 0, ready - step );

  if( ready == 0 ) {
    startTime = (new Date).getTime();
    lastTime = (new Date).getTime();
    // elapsedTime = 0;
    redraw();
  }
  else
  {
    clearCanvas( ctx2 );
    drawReady( ctx2, 1.0 );  
    // Fade canvas levels.
    $("#c1").css( { "opacity" : ( 1.0 - ready / readyTime ) } );
    $("#c2").css( { "opacity" : ( ready / readyTime ) } );
  }

  lastTime = now;
}

var advanceTransition = function() {
  
  var now = (new Date).getTime();
  var step = now - lastTime;

  transition = Math.max( 0, transition - step );

  if( transition == 0 ) {
    startTime = (new Date).getTime();
    lastTime = (new Date).getTime();
    // elapsedTime = 0;
    redraw();
  }
  else
  {
    // Transition animation made by moving the canvas elements about.
    // This might be more efficient than redrawing both mazes.
    // Ease-in ease-out.
    
    var f = 0.0 + Math.cos( transition / transitionTime * Math.PI ) * 0.5 + 0.5;

    // The offsets for the two canvas.
    var u = mult( sub( entrance, exit ), f );
    var v = mult( sub( exit, entrance ), 1.0 - f );

    // We are going IN the entrance rather than OUT.
    var entranceAngle = Math.atan2( -entranceDirection[1], -entranceDirection[0] );
    var exitAngle = Math.atan2( exitDirection[1], exitDirection[0] );
    var a = entranceAngle - exitAngle;

    // Remove any cycles so that the rotation cannot be larger than 180.
    while( a <= -Math.PI )
      a += Math.PI * 2;

    while( a >= Math.PI )
      a -= Math.PI * 2;

    // Correct the offset for rotation applied.
    u = sub( rotate( u, f * a ), exit );
    v = sub( rotate( v, ( f - 1.0 ) * a ), entrance );
   
    // Transform css.
    // The first translation places the exit in the middle, so the rotation happens about it.
    $("#c1").css( { "transform" : "" +
         "translate(" + exit[0] + "px," + exit[1] + "px)" + 
                                  "rotate(" + f * a + "rad)" + 
                                  "translate(" + u[0] + "px," + u[1] + "px)" + 
""    } );
    

    $("#c2").css( { "transform" : "" +
         "translate(" + entrance[0] + "px," + entrance[1] + "px)" + 
                                  "rotate(" + ( f - 1.0 ) * a + "rad)" + 
                                  "translate(" + v[0] + "px," + v[1] + "px)" + 
""   } );

    // Fade canvas levels.
    $("#c1").css( { "opacity" : ( 1.0 - f ) } );
    $("#c2").css( { "opacity" : f } );
  }

  drawOverlay( ctx3, 1.0 );

  lastTime = now;
}


var advanceComplete = function() {
  
  var now = (new Date).getTime();
  var step = now - lastTime;

  complete = Math.max( 0, complete - step );

  if( complete == 0 ) {
    // Record some details about the maze exit for 
    // transition animation.
    var polygon = polygons[ endPolygon ];
    exit = polygonMiddle( polygon );
    exitDirection = mult( arbitraryDirection( endPolygon ), -1 );

    // Load target level.
    levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
    palette = generatePalette( state.stage );

    // Record some details about the new maze start 
    // for transition animation.
    var polygon = polygons[ startPolygon ];
    entrance = polygonMiddle( polygon );
    entranceDirection = mult( arbitraryDirection( startPolygon ), -1 );

    // Change state to transition.
    transition = transitionTime;
    // waiting = waitingTime;
    // Play music. 
    // fadeIn( sybimo, 3 );
    redraw();
  }
  else
  {
    clearCanvas( ctx2 );
    drawComplete( ctx2, 1.0 );  
  }

  lastTime = now;
}

var advanceFail = function() {
  var now = (new Date).getTime();
  var step = now - lastTime;

  fail -= step;

  fail = Math.max( 0, fail - step );

  if( fail == 0 ) 
  {
    // Load target level.
    // levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
    // palette = generatePalette( state.stage );

    // waiting = waitingTime;
    
    menu = menuTime;
  }
  else
  {
    clearCanvas( ctx1 );
    drawFail( ctx1, 1.0 );  

    // Fade out explosion.
    var proportion = 1.0 - fail / failTime;
    var opacity = 1.0 - proportion * proportion;
    $("#c1").css( { "opacity" : opacity } );
  }

  lastTime = now;
}

var advanceSettings = function() { 
  clearCanvas( ctx2 );
  fillCanvas( ctx2, "rgba( 0,0,0,0.5)" );
  drawSettings( ctx2, 1.0 );
};

// Main loop.

var advance = function() {
  requestAnimFrame( advance );
 
  if( waiting > 0 )
    advanceWaiting();
  else if( menu > 0 )
    advanceMenu();
  else if( ready > 0 )
    advanceReady();
  else if( transition > 0 )
    advanceTransition();
  else if( complete > 0 )
    advanceComplete();
  else if( fail > 0 )
    advanceFail();
  else if( settings > 0 )
    advanceSettings();
  else
    advanceGame();
}


var save = function() {
  localStorage.setItem('maze state', JSON.stringify( state ));
};

var load = function() {
  var loaded = localStorage.getItem('maze state');
  if( loaded ) {
    state = JSON.parse( loaded );
  }
  
  state.level = Math.floor( state.level );

  // Ensure stage is present.
  // Temporarily required.
  if( state.stage == undefined )
    state.stage = 0;

  state.stage = Math.floor( state.stage );

}

// alert("Ready?");

// Initially in waiting state.
// waiting = waitingTime;

// Start at menu.
menu = menuTime;

// Get game state from local storage.
load();

var sybimo = loadAudio( "sybimo" );

var hojosita = loadAudio( "hojosita" );

// Mute or play music. 
if( state.muteMusic )
  mute( sybimo );
else
  fadeIn( sybimo, 3 );

// Mute sounds if off.
if( state.muteSounds )
  mute( hojosita );

var reset = function() {
  state = {
    level: 0,
    score: 0,
    stage: 0
  };

  var type = state.stage;
  levelScore = loadLevel( levels[ state.level ][ 0 ], type );
  palette = generatePalette( type );

  stats = calculateStats();

  redraw();
}

resize();

var settingsButton;

settingsButton = cogButton( halfDimensions[0] * 2.0 - 90 * dpr,
                            halfDimensions[1] * 2.0 - 90 * dpr,
                      halfDimensions[0] * 0.15 * dpr,
                      function(){
                        // Switch to settings page.
                        waiting = 0;
                        menu = 0;
                        settings = 1;
                        stats = calculateStats();
                        redraw();
                      } );

var levelLabel;
var bestLabel;
var percentLabel;
var resetButton;
var doneButton;
var muteSoundsButton;
var muteMusicButton;

var layoutSettings = function( ctx ){
  var margin = canvasDimensions[0] * 0.2 + 25 * dpr;
  var h = 50 * dpr;
  ctx.font= h + "px " + font + " ,monospace";
  var metrics = ctx.measureText( "Complete 100%" );
  var width = metrics.width + margin * 2;
  // Reduce font size if text extends out of view.
  h = Math.min( h, Math.floor( h * canvasDimensions[0] / width ) );
  // Spacing
  var s = h * 1.5;
  var x = margin - h * 1.5;
  var y = s;

  levelLabel = label( x,
                      y,
                      h,
                      function(){ 
                        return "Level " + ( state.level + 1 );
                      } );

  y += s;

  bestLabel = label( x,
                     y,
                     h,
                     function(){
                       return "Best level " + ( stats.best + 1 );
                     } );

  y += s;

  percentLabel = label( x,
                      y,
                      h,
                      function(){
                        return "Complete " + stats.percentage + "%";
                      } );

  y += s;

  resetButton = labelButton( x,
                        y,
                        h,
                        "Reset", 
                        reset );

  y += s;

  muteSoundsButton = soundButton( x,
                        y,
                        h,
                        function( m ){ 
                          if( m == undefined ) return state.muteSounds;
                          state.muteSounds = m;
                          if( m )
                            mute( hojosita );
                          else
                            unmute( hojosita );
                          return m;
                        } );

  y += s;

  muteMusicButton = musicButton( x,
                            y,
                            h,
                            function( m ){ 
                              if( m == undefined ) return state.muteMusic;
                              state.muteMusic = m;
                              if( m ) {
                                mute( sybimo );
                                fadeOut( sybimo, 1 );
                              } else {
                                unmute( sybimo );
                                fadeIn( sybimo, 1 );
                              }
                              return m;
                            } );
  
  doneButton = textButton( halfDimensions[0] * 2.0 - 90 * dpr,
                           halfDimensions[1] * 2.0 - 90 * dpr,
                           20 * dpr,
                           "DONE", 
                           function(){ 
                             settings = 0;
                             // waiting = waitingTime;
                             menu = menuTime;
                             redraw();
                           } );
};

if( ctx1 ) {
  layoutSettings( ctx1 );
}

// If we have computed levels for this screen size.
if( ratio in allLevels )
{
  stages = allLevels[ ratio ];
  // levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
  // palette = generatePalette( type );

}
else
{
  alert( "Levels not found for " + ratio );
}

// Initial draw and start main loop.

if( ctx1 ) {
  /*
  // Pre-game background is zoomed-in last level.
  while( loadLevel( lastLevel, state.stage ) == -1 ) {
    lastLevel++;
  }

  palette.base = '#626262';
  palette.dark = '#606060';
  palette.primary = '#686868';
  palette.secondary = '#646464';
  draw( ctx1, 4.0 );
  // Load current level back in.
  var type = state.stage;
  levelScore = loadLevel( levels[ state.level ][ 0 ], type );
  palette = generatePalette( type );
  */
  redraw();
  advance();
}


var touchWaiting = function( touch ) {
  // Nothing.
  // Draw updates are done with the animation.
}

var touchWaitingEnd = function( touch ) {
  // Hit-test 'play level' button.
  var text = ( state.level + 1 ).toString();
  if( dist( touch, halfDimensions ) < textButtonRadius( ctx1, text, 100, 1.0 ) ) {
    waiting = 0;
    ready = readyTime;
    // Turn down music.
    fadeOut( sybimo, 3 );
    redraw();
  }

  settingsButton.press( touch );
}

var touchMenu = function( touch ) {
  // Nothing.
  if( menuDragStart == undefined ) 
  {
    menuDragStart = touch;
    menuDrag = [0,0];
  }
  else
  {
    var d = sub( touch, menuDragStart );
    menuDrag = d;
  }

}

var touchMenuEnd = function( touch ) {
  settingsButton.press( touch );
  menuDragStart = undefined;

  var h = Math.floor( halfDimensions[0] / 4 );
  var r = textButtonRadius( ctx1, "99", h, 1.0 );

  var spacing = r * 1.7;
  var n = Math.floor( halfDimensions[0] / spacing );

  // Calculate new stage.
  var stageNew = Math.floor( state.stage - menuDrag[0] / ( spacing + r )  + 0.5 );
  // Clamp to the number of stages.
  stageNew = Math.min( Math.max( 0, stageNew ), stages.length - 1 );
  // Update 'drag' so we are offset from the new stage. 
  menuDrag[0] = menuDrag[0] + ( stageNew - state.stage ) * ( spacing + r );
  // Update stage.
  state.stage = stageNew;


  if( dist( touch, halfDimensions ) < r && Math.abs( menuDrag[0] ) < r * 0.1 )
  {
    menu = 0;
    state.level = 0;
    levels = stages[ state.stage ];
    palette = generatePalette( state.stage );
    levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
    ready = readyTime;
    redraw();
  }
  
  settingsButton.press( touch );
}

var touchSettings = function( touch ) {
  // Re-draw on animation.
}

var touchSettingsEnd = function( touch ) {
  resetButton.press( touch );
  doneButton.press( touch );
  muteSoundsButton.press( touch );
  muteMusicButton.press( touch );
}

// If we have not computed the levels for this dimension we simply show the 
// dimensions.
if( ! ( ratio in allLevels ) ) {
  $("body").html( "<body><p><code>" + canvasDimensions + " " + ratio + "</code></p></body>" );
};

$(window).on( "touchstart", function( e ) {
  if( e.originalEvent.touches.length == 1 )
  {
    e.preventDefault();
    touch = [ e.originalEvent.touches[0].pageX - $("#c2").offset().left,
              e.originalEvent.touches[0].pageY - $("#c2").offset().top ];
    if( playing() ) {
      touchPathStart( touch );
    } else if( settings > 0 ) {
      touchSettings( touch );
    } else if( menu > 0 ) {
      touchMenu( touch );
    }
    return false;
  }
});

$(window).on( "touchmove", function( e ) {
  if( e.originalEvent.touches.length > 0 && touch )
  {
    e.preventDefault();
    touch = [ e.originalEvent.touches[0].pageX - $("#c2").offset().left,
              e.originalEvent.touches[0].pageY - $("#c2").offset().top ];
    if( playing() ) {
      touchPath( touch );
    } else if( settings > 0 ) {
      touchSettings( touch );
    } else if( menu > 0 ) {
      touchMenu( touch );
    } else if( waiting > 0 ) {
      touchWaiting( touch );
    }
    return false;
  }
});

$(window).on( "touchend", function( e ) {
  if( e.originalEvent.touches.length == 0 && touch )
  {
    e.preventDefault();
    if( settings > 0 ) {
      touchSettingsEnd( touch );
    } else if( menu > 0 ) {
      touchMenuEnd( touch );
    } else if( waiting > 0 ) {
      touchWaitingEnd( touch );
    }
    touch = undefined;
    return false;
  }
});

$(window).on( "mousedown", function( e ) {
  if( e.originalEvent.button == 0 && $("#c2").length != 0 )
  {
    e.preventDefault();
    touch = [ e.pageX - $("#c2").offset().left,
              e.pageY - $("#c2").offset().top ];
    if( playing() ) {
      touchPathStart( touch );
    } else if( settings > 0 ) {
      touchSettings( touch );
    } else if( menu > 0 ) {
      touchMenu( touch );
    }
    return false;
  }
});

$(window).on( "mousemove", function( e ) {
  if( touch && $("#c2").length != 0 )
  {
    e.preventDefault();
    touch = [ e.pageX - $("#c2").offset().left,
              e.pageY - $("#c2").offset().top ];
    if( playing() ) {
      touchPath( touch );
    } else if( settings > 0 ) {
      touchSettings( touch );
    } else if( waiting > 0 ) {
      touchWaiting( touch );
    } else if( menu > 0 ) {
      touchMenu( touch );
    }
    return false;
  }
});


$(window).on( "mouseup", function( e ) {
  if( e.originalEvent.button == 0 && $("#c2").length != 0 ) 
  {
    e.preventDefault();
    if( settings > 0 ) {
      touchSettingsEnd( touch );
    } else if( waiting > 0 ) {
      touchWaitingEnd( touch );
    } else if( menu > 0 ) {
      touchMenuEnd( touch );
    }
    touch = undefined;
    return false;
  }
});

var secret = "RESET";
var secretPos = 0;

$(document).on( "keydown", function( e ){
  switch(e.which) {
  case 37: // left
    if( state.level > 0 ) {
      state.level--;
      levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
      save();
      redraw();
    }
    break;

  case 38: // up
    break;

  case 39: // right
    if( state.level + 1 < levels.length ) {
      state.level++;
      levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
      save();
      redraw();
    }
    break;

  case 40: // down
    break;
/*
  case 82: // r
    if( refine == 2 )
      refine = 0;
    else
      refine = 2;
    levelScore = loadLevel( levels[ state.level ][ 0 ], state.stage );
    redraw();
    break;
*/
    default: 
    var c = secret.charCodeAt( secretPos ); 
    if( e.which == c ) 
      secretPos++;
    else
      secretPos = 0;
    if( secretPos == secret.length )
      reset();
   
    return; // exit this handler for other keys
  }

  e.preventDefault();
} );




