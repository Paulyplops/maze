



var c = document.getElementById('c');
var ctx;
if( c ) ctx = c.getContext('2d');

var palette;
var index;

var drawPalette = function( palette, j ) {
  var swatch = 200;
  var spacing = 5;
  var p = [ palette.base, 
            palette.dark, 
            palette.highlight, 
            palette.primary ];

  for( var i = 0; i < p.length; ++i )
  {
    ctx.fillStyle = p[ i ];
    ctx.fillRect( spacing + (swatch + spacing) * i, spacing + (swatch + spacing) * j, swatch, swatch );
  }
}


var draw = function() {
  clearCanvas( ctx );
  ctx.fillStyle = '#dddddd';
  ctx.font="100px " + font;
  ctx.fillText( index.toString(), 25, 175 );
  drawPalette( palette, 1 );
}

var resize = function() {
  c.width = $('#c').width();
  c.height = $('#c').height();
}


resize();

index = 0;

seedPseudoRandom( index );
palette = generatePalette();

draw();


$(document).on( "keydown", function( e ){
  switch(e.which) {
  case 37: // left
    if( index > 0 ) {
      index--;
      seedPseudoRandom( index );
      palette = generatePalette();
      draw();
    }
    break;

  case 39: // right
    index++;
    seedPseudoRandom( index );
    palette = generatePalette();
    draw();
    break;
  }
});

