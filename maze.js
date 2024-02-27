
var background = "#aaaaaa";

var c = document.getElementById('c');
var ctx = c.getContext('2d');

// Display dimensions [w,h] in pixels.
var displayDimensions = [];
// Maze dimensions [w,h] in maze units.
var mazeDimensions = [];

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
var dual = [];

var startPolygon;
var endPolygon;

var random = 0;

var touch = undefined;

var path = [];

var palette;

var level = 0;

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


var rgbToHex = function( c ) {
  var clamp = function( c ) {
    return Math.round( Math.min( 255, Math.max( 0, c ) ) );
  }
  var r = clamp( c[0] );
  var g = clamp( c[1] );
  var b = clamp( c[2] );
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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

// Golden angle is approx 2.4.
// http://en.wikipedia.org/wiki/Golden_angle

var generatePalette = function() {
  var palette = {};
  var h = pseudoRandom() * Math.PI * 2;
  var n = 1;

  palette.base = rgbToHex( lshToRgb( [ 50, 50, h ] ) );
  palette.dark = rgbToHex( lshToRgb( [ 30, 30, h ] ) );
  
  palette.primary = [];
  for( var i = 0; i < n; ++i ) {
    palette.primary[ i ] = rgbToHex( lshToRgb( [ 50, 20 + i * 10, h ] ) );
  }

  h += 1.4;
  palette.secondary = [];
  for( var i = 0; i < n; ++i ) {
    palette.secondary[ i ] = rgbToHex( lshToRgb( [ 50, 20 + i * 10, h ] ) );
  }

  h += 1.8;
  palette.highlight = rgbToHex( lshToRgb( [ 50, 80, h ] ) );

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
  ctx.rect( 0, 0, displayDimensions[0], displayDimensions[1] );  
  ctx.closePath();  
  ctx.fill(); 
};

var resize = function() {
  // Viewport constrained by height.
  displayDimensions[0] = $(window).width();
  displayDimensions[1] = $(window).height();
  c.width = displayDimensions[0];
  c.height = displayDimensions[1];

  draw();
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

// a & b are the vertices.

var addPolygonToEdge = function( n, a, b ) {
  var l = vertices.length;

  var va = vertices[ a ];
  var vb = vertices[ b ];
  var v = sub( vb, va );
  var d = Math.PI * 2 / n;
  var x = vb;
  var p = [ a, b ];

  for( var i = 2; i < n; ++i ) {
    var v = rotate( v, d );
    x = add( x, v );
    p[ i ] = addVertex( x );
  }

  addPolygonToPerimeter( p, polygons.length );
  polygons.push( p );
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
    addPolygonToEdge( n, edge[1], edge[0] );
  }
}

// Locate maze entrance and exit.
// BUG: start and end might not be connected!

var findStartAndEnd = function() {
  var n = perimeter.length;
  var startIndex = Math.floor( pseudoRandom() * n );
  var endIndex = ( startIndex + Math.floor( n / 2 ) ) % n
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
  var stack = [ p ];
  while( Object.keys( unvisited ).length ) {
    // Update visited structures.
    delete unvisited[ p ];
    var w = polygonWalls( p );
    w = w.filter( function( i ){ return otherPolygon( walls[ i ], p ) in unvisited; } );
    if( w.length && p != endPolygon ) {
      // Add to stack.
      stack.push( p );
      var n = pseudoRandomSelect( w );
      var q = otherPolygon( walls[ n ], p );
      // Record link.
      dual.push( walls[ n ] );
      // Remove wall.
      walls.splice( n, 1 );
      p = q;
    } else {
      // Remove dead-end p from the stack.
      stack.splice( stack.indexOf( p ), 1 );
      if( stack.length ) {
        // Pick an arbitrary point in the stack.
        p = pseudoRandomSelect( stack );
      } else {
        // Pick from 'unvisited'.
        p = pseudoRandomSelect( Object.keys( unvisited ) );
      }
    }
  }
}

// Search from the polygon p for a route to the 
// end of the current path.

var walk = function( p ) {
  // Change this to walk from the end of the path.
  var link = {};
  link[p] = -1;
  for( var i = 0; i < 2; ++i ) {
    var keys = Object.keys( link );
    for( var j = 0; j < keys.length; ++j ) {
      var q = Math.floor( keys[j] );
      var w = polygonDual( q );
      for( var k = 0; k < w.length; ++k ) {
        var other = otherPolygon( dual[ w[ k ] ], q );
        if(other in link ) {
        } else {
          link[ other ] = q;
        }
      }
    }
  }

  var keys = Object.keys( link );
  for( var j = 0; j < keys.length; ++j ) {
    var q = Math.floor( keys[j] );
    if( q == path[ path.length - 1 ] ) {
      // Glue on path.
      q = link[ q ]; 
      while( q != -1 ) {
        path.push( q );
        q = link[ q ]; 
      }
      return true;
    }
    /*
    // Should dragging be able to cut the path back?
    var index = path.indexOf( q );
    // Have we hit the path?
    if( index != -1 ) 
    {
      // Trim of any surplus path.
      if( index != path.length - 1 ) {
        path.splice( index + 1 );
      }
      // Glue on path.
      while( q != -1 ) {
        q = link[ q ]; 
        path.push( q );
      }
      break;
    }
    */
  }
  return false;
}

var findPolygonTouched = function( t ) {
  var halfWidth = displayDimensions[0] / 2;
  var halfHeight = displayDimensions[1] / 2;
  var scale = Math.min( displayDimensions[0] / mazeDimensions[0],
                        displayDimensions[1] / mazeDimensions[1] );

  var point = [ ( t[0] - halfWidth ) / scale, ( t[1] - halfHeight ) / scale ];
  
  for( var p = 0; p < polygons.length; ++p ) {
    if( polygonContains( point, p ) ) {
      return p;
    }
  }

  return -1;
}

var touchPath = function( t ) {
  var p = findPolygonTouched( t );
  var changed = false;
  if( p != -1 ) {
    var index = path.indexOf( p );
    if( index == -1 )
    {
      changed = walk( p );
    }
  }
/*
  for( var p = 0; p < polygons.length; ++p ) {
    if( polygonContains( point, p ) ) {
      var index = path.indexOf( p );
      if( index == -1 )
      {
        changed = walk( p );
      } else if( index != path.length - 1 && trim == true ) {
        // If the polygon is already in the path, and not the last item,
        // trim the path back.
        path.splice( index + 1 );
        changed = true;
      }
    }
  }
  */

  if( changed ) {
    finished();
    draw();
  }
}

// When starting a drag allow the user to trim back the path.

var touchPathStart = function( t ) {
  var p = findPolygonTouched( t );
  var changed = false;
  if( p != -1 ) {
    var index = path.indexOf( p );
    if( index == -1 )
    {
      changed = walk( p );
    } else if( index != path.length - 1 ) {
      // If the polygon is already in the path, and not the last item,
      // trim the path back.
      path.splice( index + 1 );
      changed = true;
    }
  }

  if( changed ) {
    finished();
    draw();
  }
}

var finished = function() {
  if( endPolygon == path[ path.length - 1 ] ) {
    level += 1;
    loadLevel( level );
  }
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


var draw = function() {
  var halfWidth = displayDimensions[0] / 2;
  var halfHeight = displayDimensions[1] / 2;

  var scale = Math.min( displayDimensions[0] / mazeDimensions[0],
                        displayDimensions[1] / mazeDimensions[1] );

  fillCanvas( ctx, background );

  // Draw oversized finish polygon.
  {
    var polygon = polygons[ endPolygon ];
    var massive = 1.5;

    var mean = [0,0];
      
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      mean = add( point, mean );
    }

    mean = div( mean, polygon.length + 0.0 );

    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    var start = add( mult( sub( vertices[ polygon[0] ], mean ), massive ), mean );
    ctx.moveTo( start[0] * scale + halfWidth, start[1] * scale + halfHeight );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = add( mult( sub( vertices[ polygon[v] ], mean ), massive ), mean );
      ctx.lineTo( point[0] * scale + halfWidth, point[1] * scale + halfHeight );
    }
    ctx.closePath();
    ctx.fill();
  }

  for( var p = 0; p < polygons.length; ++p )
  {
    var polygon = polygons[p];
    // Is the polygon in the current path.
    if( path.indexOf( p ) != -1 ) {
      ctx.fillStyle = palette.highlight;
    } else {
      ctx.fillStyle = palette.primary[ p % palette.primary.length ];
    }
    ctx.beginPath();
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] * scale + halfWidth, start[1] * scale + halfHeight );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] * scale + halfWidth, point[1] * scale + halfHeight );
    }
    ctx.closePath();
    ctx.fill();

    var indexLabels = false;
    if( indexLabels )
    {
      ctx.fillStyle = '#dddddd';
      ctx.font="20px Verdana"
      for( var v = 0; v < polygon.length; ++v )
      {
        var point = vertices[ polygon[ v ] ];
        ctx.fillText( v.toString(), point[0] * scale + halfWidth + 5, point[1] * scale + halfHeight + 5 );
      }
    }
  }

  for( var e = 0; e < perimeter.length; ++e )
  {
    var edge = perimeter[ e ];
    if( edge.p != endPolygon )
    {
      ctx.strokeStyle = palette.dark;
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      var start = vertices[ edge[ 0 ] ];
      ctx.moveTo( start[0] * scale + halfWidth, start[1] * scale + halfHeight );
      var end = vertices[ edge[ 1 ] ];
      ctx.lineTo( end[0] * scale + halfWidth, end[1] * scale + halfHeight );
      ctx.stroke();
    }
  }
  
  for( var e = 0; e < walls.length; ++e )
  {
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    var edge = walls[ e ];
    var start = vertices[ edge[ 0 ] ];
    ctx.moveTo( start[0] * scale + halfWidth, start[1] * scale + halfHeight );
    var end = vertices[ edge[ 1 ] ];
    ctx.lineTo( end[0] * scale + halfWidth, end[1] * scale + halfHeight );
    ctx.stroke();
  }
}

var loadLevel = function( l ) {
  // Seed by level.
  seedPseudoRandom( l );

  vertices = [];
  polygons = [];
  perimeter = [];
  walls = [];
  dual = [];

  var type = Math.floor( pseudoRandom() * 4 );
  var s = Math.floor( pseudoRandom() * 1 ) + 4;
  var r = pseudoRandom() * 3.14;
  switch( type ){
  case 0:
    // Square grid.
    addPolygon( 4, 0, 0, 50, r );
    for( var i = 0; i < s + 2; ++i ) {
      addToPerimeter( 4 );
    }
    break;
  case 1:
    // Triangles.
    addPolygon( 3, 0, 0, 50, r );
    for( var i = 0; i < s + 4; ++i ) {
      addToPerimeter( 3 );
    }
    break;
  case 2:
    // Hexagons.
    addPolygon( 6, 0, 0, 50, r );
    for( var i = 0; i < s; ++i ) {
      addToPerimeter( 6 );
    }
    break;
  case 3:
    // Hex + tri.
    addPolygon( 6, 0, 0, 50, r );
    for( var i = 0; i < s; ++i ) {
      addToPerimeter( 3 );
      addToPerimeter( 6 );
    }
    break;
  }

  mazeDimensions = calculateMazeDimensions();
  findStartAndEnd();
  buildMaze();

  palette = generatePalette();
}

loadLevel( level );

$(window).on( "resize", resize );

$("#c").on( "touchstart", function( e ) {
  e.preventDefault();
  if( e.originalEvent.touches.length == 1 )
  {
    touch = [ e.originalEvent.touches[0].pageX,
              e.originalEvent.touches[0].pageY ];
    touchPathStart( touch, true );
    return false;
  }
});

$("#c").on( "touchmove", function( e ) {
  e.preventDefault();
  if( e.originalEvent.touches.length > 0 && touch )
  {
    touch = [ e.originalEvent.touches[0].pageX,
              e.originalEvent.touches[0].pageY ];
    touchPath( touch );
    return false;
  }
});

$("#c").on( "touchend", function( e ) {
  e.preventDefault();
  if( e.originalEvent.touches.length == 0 && touch )
  {
    touch = undefined;
    return false;
  }
});

$("#c").on( "mousedown", function( e ) {
  if( e.originalEvent.button == 0 )
  {
    e.preventDefault();
    touch = [ e.pageX,
              e.pageY ];
    touchPathStart( touch, true );
    return false;
  }
});

$("#c").on( "mousemove", function( e ) {
  if( touch )
  {
    e.preventDefault();
    touch = [ e.pageX,
              e.pageY ];
    touchPath( touch );
    return false;
  }
});


$("#c").on( "mouseup", function( e ) {
  if( e.originalEvent.button == 0 )
  {
    e.preventDefault();
    touch = undefined;
    return false;
  }
});

// Trigger initial draw.
resize();

var failure = "";

var check = function( f, m ) {
  if( !f ) {
    failure += m;
    failure += '\n';
  }
}

var test = function() {
  check( rgbToHex( [255,255,255] ) == "#ffffff", "rgbToHex1" );
  check( rgbToHex( [50,100,150] ) == "#326496", "rgbToHex2" );
  check( rgbToHex( labToRgb( [0,0,0] ) )  == "#000000", "labToRgb1" );
  check( rgbToHex( labToRgb( [100,0,0] ) ) == "#ffffff", "labToRgb2" );
  check( rgbToHex( labToRgb( [34.188,8.072,-32.478] ) ) == "#384f84", "labToRgb3" );
  if( failure ) {
    console.log( failure );
  }
}

test();

var drawPalette = function( palette, j ) {
  var swatch = 100;
  var spacing = 10;
  var p = [ palette.base, 
            palette.dark, 
            palette.highlight, 
            palette.primary[0],
            palette.primary[1],
            palette.primary[2],
            palette.primary[3],
            palette.primary[4],
            palette.secondary[0],
            palette.secondary[1],
            palette.secondary[2],
            palette.secondary[3],
            palette.secondary[4] ];

  for( var i = 0; i < p.length; ++i )
  {
    ctx.fillStyle = p[ i ];
    ctx.fillRect( spacing + (swatch + spacing) * i, spacing + (swatch + spacing) * j, swatch, swatch );
  }
}

