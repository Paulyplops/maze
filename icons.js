
var index = 101;

var draw = function() { 
  $("canvas").each( function( i, c ) {
    var ctx = c.getContext('2d');

    c.width = $(this).width();
    c.height = $(this).height();
    
    displayDimensions[0] = c.width;
    displayDimensions[1] = c.height;
    
    var s = 0.4;

    canvasDimensions[0] = 600 * s;
    canvasDimensions[1] = 600 * s;

    halfDimensions = div( displayDimensions, 2.0 );

    loadLevel( index, s );

    // palette.base = '#aaaaaa';
    // palette.dark = '#444444';
    // palette.primary[0] = '#cccccc';

    var gradient = ctx.createLinearGradient( halfDimensions[0] * -0.1, halfDimensions[0] * -0.5, halfDimensions[0] * 0.5, halfDimensions[1] * 2.5 );
    gradient.addColorStop( 1.0, palette.dark );
    gradient.addColorStop( 0.8, palette.base );
    gradient.addColorStop( 0.0, palette.primary );
    ctx.fillStyle = gradient;
    ctx.fillRect( 0, 0, displayDimensions[0], displayDimensions[1] );

    var t = c.width / 100;
    drawWalls( ctx, t );

    var maze = true;
    if( maze ) {
      ctx.textAlign="center"; 
      ctx.textBaseline="middle"; 
      ctx.fillStyle = '#ffffff';
      ctx.font= c.width / 2 + "px " + font;
      ctx.fillText( "M", halfDimensions[0] * 0.6, halfDimensions[1] * 0.6 );
      ctx.fillText( "A", halfDimensions[0] * 1.4, halfDimensions[1] * 0.6 );
      ctx.fillText( "Z", halfDimensions[0] * 0.6, halfDimensions[1] * 1.5 );
      ctx.fillText( "E", halfDimensions[0] * 1.4, halfDimensions[1] * 1.5 );
    }

    var circleM = false;
    if( circleM ) {
      ctx.fillStyle = '#999999';
      var r = c.width * 0.3;
      ctx.beginPath();
      ctx.moveTo( halfDimensions[0], 
                  halfDimensions[1] );
      ctx.arc( halfDimensions[0], 
               halfDimensions[1], r, 0, 2 * Math.PI, false );
      ctx.fill();

      ctx.textAlign="center"; 
      ctx.textBaseline="middle"; 
      ctx.fillStyle = '#ffffff';
      ctx.font= c.width * 0.4 + "px " + font;
      ctx.fillText( "M", halfDimensions[0], halfDimensions[1] );
    }

    var m = false;
    if( m ) {
      ctx.textAlign="center"; 
      ctx.textBaseline="middle"; 
      ctx.fillStyle = '#ffffff';
      ctx.font= c.width * 0.6 + "px " + font;
      ctx.fillText( "M", halfDimensions[0], halfDimensions[1] );
    }

    var shiny = true;
    if( shiny ) {
      var gradient = ctx.createLinearGradient( 0, 0, halfDimensions[0] * 0.1, halfDimensions[1] );
      gradient.addColorStop( 0.5, "rgba( 250, 250, 250, 0 )");
      gradient.addColorStop( 1.0, "rgba( 250, 250, 250, 0.3 )");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo( 0, 0 );
      ctx.lineTo( halfDimensions[0] * 2.0, halfDimensions[1] * 0.0 );
      ctx.lineTo( halfDimensions[0] * 2.0, halfDimensions[1] * 1.2 );
      ctx.lineTo( halfDimensions[0] * 0.0, halfDimensions[1] * 0.8 );
      ctx.closePath();
      ctx.fill();
    };

  } );
}

draw();

window.setTimeout( function(){ 
  draw();
}, 100 );


$(document).on( "keydown", function( e ){
  switch(e.which) {
  case 37: // left
    if( index > 0 ) {
      index--;
      draw();
    }
    break;

  case 39: // right
    index++;
    draw();
    break;
  }
});

