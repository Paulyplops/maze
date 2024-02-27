
var background = "#aaaaaa";

var c = document.getElementById('c');
var ctx = c.getContext('2d');

var width;
var height;

// Array of coordinates [x,y].
var vertices = [];
// Array of polygon vertex indices [a,b,c...n].
var polygons = [];
// Array of edges on perimeter of tiling.
// Each edge is a pair of vertex indices [a,b].
// The edge is directed a->b.
// Edges on the perimeter also have a polygon index attribute p.
var perimeter = [];
// Graph connectivity.
// Each wall is a pair of vertex indices [a,b].
// The edge is not directed, a is always less than b.
// Walls also have two polygon index attributes p & q where p < q.
var walls = [];

var startPolygon;
var endPolygon;

var random = 0;

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


var pseudoRandomSelect = function( v ) {
  return v[ Math.floor( v.length * pseudoRandom() ) ];
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
    console.log( "Remove item." );
  } else {
    perimeter.push( e );
  }
};

var fillCanvas = function( ctx, col ) {
  ctx.fillStyle = col;  
  ctx.beginPath();  
  ctx.rect(0, 0, width, height * 3);  
  ctx.closePath();  
  ctx.fill(); 
};

var resize = function() {
  // Viewport constrained by height.
  width = $(window).width();
  height = $(window).height();
  c.width = width;
  c.height = height;

  draw();
};

var addPolygonToPerimeter = function( polygon, p ) {
  var n = polygon.length;
  for( var i = 0; i < n - 1; ++i ) {
    addEdgeToPerimeter( makeEdge( polygon[ i ], polygon[ i + 1 ], p ) );
  }
  addEdgeToPerimeter( makeEdge( polygon[ n - 1 ], polygon[ 0 ], p ) );
};

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
      console.log("REMOVED!")
      continue;
    }
    addPolygonToEdge( n, edge[1], edge[0] );
  }
}

var findStartAndEnd = function() {
  var n = perimeter.length;
  var startIndex = Math.floor( pseudoRandom() * n );
  var endIndex = ( startIndex + Math.floor( n / 2 ) ) % n
  startPolygon = perimeter[ startIndex ].p;
  endPolygon = perimeter[ endIndex ].p;
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

var range = function( n ) {
  var r = {};
  for( var i = 0; i < n; ++i ) {
    r[ i ] = true;
  }
  return r;
}


var buildMaze = function() {
  var unvisited = range( polygons.length );
  var p = startPolygon;
  var visited = {};
  var stack = [];
  while( Object.keys( unvisited ).length ) {
    // Update visited structures.
    visited[ p ] = true;
    delete unvisited[ p ];
    stack.push( p );
    var w = polygonWalls( p );
    w = w.filter( function( i ){ return otherPolygon( walls[ i ], p ) in unvisited; } );
    if( w.length && p != endPolygon ) {
      var n = pseudoRandomSelect( w );
      var q = otherPolygon( walls[ n ], p );
      // Remove wall.
      walls.splice( n, 1 );
      p = q;
    } else {
      p = pseudoRandomSelect( stack );
    }
  }
}



var draw = function() {
  var halfWidth = width / 2;
  var halfHeight = height / 2;

  fillCanvas( ctx, background );

  for( var p = 0; p < polygons.length; ++p )
  {
    var polygon = polygons[p];
    if( p == startPolygon ) {
      ctx.fillStyle = '#dd6655';
    } else {
      ctx.fillStyle = '#888888';
    }
    ctx.beginPath();
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] + halfWidth, start[1] + halfHeight );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] + halfWidth, point[1] + halfHeight );
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
        ctx.fillText( v.toString(), point[0] + halfWidth + 5, point[1] + halfHeight + 5 );
      }
    }
  }

  for( var e = 0; e < perimeter.length; ++e )
  {
    var edge = perimeter[ e ];
    if( edge.p != endPolygon )
    {
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      var start = vertices[ edge[ 0 ] ];
      ctx.moveTo( start[0] + halfWidth, start[1] + halfHeight );
      var end = vertices[ edge[ 1 ] ];
      ctx.lineTo( end[0] + halfWidth, end[1] + halfHeight );
      ctx.stroke();
    }
  }
  
  for( var e = 0; e < walls.length; ++e )
  {
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    var edge = walls[ e ];
    var start = vertices[ edge[ 0 ] ];
    ctx.moveTo( start[0] + halfWidth, start[1] + halfHeight );
    var end = vertices[ edge[ 1 ] ];
    ctx.lineTo( end[0] + halfWidth, end[1] + halfHeight );
    ctx.stroke();
  }
}

// Seed by level.
seedPseudoRandom( 0 );

// Hex + tri.
/*
addPolygon( 6, 0, 0, 50, 0.1 );
addToPerimeter( 3 );
addToPerimeter( 6 );
addToPerimeter( 3 );
addToPerimeter( 6 );
addToPerimeter( 3 );
addToPerimeter( 6 );
*/

// Hex + tri again.
/*
addPolygon( 3, 0, 0, 50, 0.1 );
addToPerimeter( 6 );
addToPerimeter( 3 );
addToPerimeter( 6 );
addToPerimeter( 3 );
addToPerimeter( 6 );
*/
// Square grid.
/*
addPolygon( 4, 0, 0, 50, 0 );
addToPerimeter( 4 );
addToPerimeter( 4 );
addToPerimeter( 4 );
*/

// Triangles.
/*
addPolygon( 3, 0, 0, 50, 0 );
addToPerimeter( 3 );
addToPerimeter( 3 );
addToPerimeter( 3 );
addToPerimeter( 3 );
addToPerimeter( 3 );
addToPerimeter( 3 );
addToPerimeter( 3 );
addToPerimeter( 3 );
*/
// Hexagons.
addPolygon( 6, 0, 0, 50, 0.1 );
addToPerimeter( 6 );
addToPerimeter( 6 );
addToPerimeter( 6 );
addToPerimeter( 6 );
addToPerimeter( 6 );

findStartAndEnd();
buildMaze();


$(window).on( "resize", resize );

resize();






