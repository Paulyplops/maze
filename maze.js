
var background = "#aaaaaa";

var c = document.getElementById('c');
var ctx = c.getContext('2d');

var width;
var height;

var vertices = [];
var polygons = [];
var perimeter = [];

var addVertex = function( v ) {
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
    perimeter.splice( i, 1 );
    return true;
  } else {
    return false;
  }
}

var addEdge = function( e ) {
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

var addPerimeter = function( p ) {
  var n = p.length;
  for( var i = 0; i < n - 1; ++i ) {
    addEdge( [ p[ i ], p[ i + 1 ] ] );
  }
  addEdge( [ p[ n - 1 ], p[ 0 ] ] );
};

var addPolygon = function( n, x, y, r, t ) {
  var p = [];
  for( var i = 0; i < n; ++i ) {
    var u = i * Math.PI * 2 / n + t;
    var a = x + Math.cos( u ) * r;
    var b = y - Math.sin( u ) * r 
    p[ i ] = addVertex( [ a, b ] );
  }

  addPerimeter( p );

  polygons.push( p );
}

var swap = function( a ) {
  return [ a[1], a[0] ];
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

  addperimeter( p );
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
    edges.push( [ edge[0], edge[1] ] );
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


var draw = function() {
  var halfWidth = width / 2;
  var halfHeight = height / 2;

  fillCanvas( ctx, background );

  for( var p = 0; p < polygons.length; ++p )
  {
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    var polygon = polygons[p];
    var start = vertices[ polygon[0] ];
    ctx.moveTo( start[0] + halfWidth, start[1] + halfHeight );
    for( var v = 0; v < polygon.length; ++v )
    {
      var point = vertices[ polygon[ v ] ];
      ctx.lineTo( point[0] + halfWidth, point[1] + halfHeight );
    }
    ctx.closePath();
    ctx.stroke();

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
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    var edge = perimeter[ e ];
    var start = vertices[ edge[ 0 ] ];
    ctx.moveTo( start[0] + halfWidth, start[1] + halfHeight );
    var end = vertices[ edge[ 1 ] ];
    ctx.lineTo( end[0] + halfWidth, end[1] + halfHeight );
    ctx.stroke();
  }


}

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
*/

// Hexagons.

addPolygon( 6, 0, 0, 50, 0.1 );
addToPerimeter( 6 );
addToPerimeter( 6 );
addToPerimeter( 6 );
addToPerimeter( 6 );

$(window).on( "resize", resize );

resize();



