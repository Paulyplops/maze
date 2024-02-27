
var background = "#aaaaaa";

var c = document.getElementById('c');
var ctx = c.getContext('2d');

var width;
var height;

var vertices = [];
var polygons = [];

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

var addPolygon = function( n, x, y, r, t ) {
  var l = vertices.length;
  var p = [];
  for( var i = 0; i < n; ++i ) {
    var u = i * Math.PI * 2 / n + t;
    var a = x + Math.sin( u ) * r;
    var b = y + Math.cos( u ) * r 
    vertices[ i + l ] = [ a, b ];
    p[ i ] = i + l;
  }
  polygons.push( p );
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

var addPolygonToEdge = function( n, a, b, r ) {
  var vp = perpendicular( sub( b, a ) );

  var vn = mult( norm( vp ), r );

  var vm = add( mid( a, b ), vn );

  addPolygon( n, vm[0], vm[1], r, 0 );
}

var addToPolygon = function( n, r, p ) {
  var l = vertices.length;
  var polygon = polygons[ p ];
  var a = vertices[ polygon[ 0 ] ];
  for( var i = 1; i < polygon.length; ++i ) {
    var b = vertices[ polygon[ i ] ];
    addPolygonToEdge( n, b, a, r );
    a = b;
  }
  addPolygonToEdge( n, vertices[ polygon[ 0 ] ], b, r );
}

var draw = function() {
  var halfWidth = width / 2;
  var halfHeight = height / 2;

  fillCanvas( ctx, background );

  for( var p = 0; p < polygons.length; ++p )
  {
    ctx.strokeStyle = '#dddddd';
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
  }
}


addPolygon( 5, 0, 0, 100, 0 );

addToPolygon( 5, 100, 0 );

$(window).on( "resize", resize );

resize();



