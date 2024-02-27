

// How large to make the waiting button.
// Radius is the width of the level text.

var textButtonRadius = function( ctx, text, h, scale ) {
  // Probably just not loaded yet.
  if( !isFontReady( ctx, font ) )
    return 0;
  
  ctx.font= h + "px " + font + " ,monospace";
  var metrics = ctx.measureText( text );
  return Math.max( h * 0.8, metrics.width );
}

var drawCircle = function( ctx, x, y, r ) {
  var n = 50;
  ctx.beginPath();
  ctx.moveTo( Math.cos( 0 ) * r + x, Math.sin( 0 ) * r + y );
  for( var i = 1; i < n; ++i ) {
    var u = i * Math.PI * 2 / n;
    ctx.lineTo( Math.cos( u ) * r + x, Math.sin( u ) * r + y );
  }
  ctx.closePath();
}

// Basic label object constructor.
var label = function( x, y, h, f ) {
  // Private data.
  // Label is inset where the button would go.
  var r = h * 0.5;
  // Members:
  return { 
    draw:function( ctx, scale ){
      ctx.fillStyle = '#dddddd';
      ctx.font= h + "px " + font + " ,monospace";
      ctx.textAlign="left"; 
      ctx.textBaseline="middle";
      var text = f();
      ctx.fillText( text, x + r * 1.5, y );
    }
  };
}

// Basic button object constructor.
var baseButton = function( x, y, r, f ) {
  // Private fn.
  var highlight = function() {
    var colour = '#dddddd';
    if( touch && hitTest( touch ) ) {
      colour = '#ffffff';
    }
    return colour;
  }
  var hitTest = function( pos ) {
    return dist( pos, [x,y] ) < r; 
  }
  // Members:
  return { 
    hitTest:function( pos ) {
      return hitTest( pos );
    },
    // Expose highlight to subclass.
    highlight:function() {
      return highlight();
    },
    draw:function( ctx, scale ){
      ctx.strokeStyle = highlight();
      ctx.fillStyle = '#999999';
      ctx.lineWidth = 3.0;
      drawCircle( ctx, x, y, r );
      ctx.fill();
      ctx.stroke();
    }, 
    press:function( pos ){
      if( hitTest( pos ) ) {
        f();
        return true;
      } else {
        return false;
      }
    }
  };
}

// Text button object constructor.
// The supplied text is inside the button.
var textButton = function( x, y, h, text, f ) {
  // Private data.
  var r;
  // Construct base button.
  var button = {}; 
  var baseDraw;
  // Override draw fn.
  button.draw = function( ctx, scale ){
    if( !r ) {
      // Insane lazy initialisation.
      // Wait until context is ready to call base class constructor.
      r = textButtonRadius( ctx, text, h );
      var b = baseButton( x, y, r, f );
      button.hitTest = b.hitTest;
      button.highlight = b.highlight;
      button.press = b.press;
      baseDraw = b.draw
    }
    // Delegate to base class draw.
    baseDraw( ctx, scale );
    ctx.font= h + "px " + font + " ,monospace";
    ctx.fillStyle = button.highlight();
    ctx.textAlign="center"; 
    ctx.textBaseline="middle"; 
    ctx.fillText( text, x, y );
  };
  return button;
}

// Button object constructor with a label alongside.
var labelButton = function( x, y, h, text, f ) {
  // Private data.
  var r = h * 0.5;
  // Construct base button.
  var button = baseButton( x, y, r, f );
  var baseDraw = button.draw;
  // Override draw fn.
  button.draw = function( ctx, scale ){
    // Delegate to base class draw.
    baseDraw( ctx, scale );
    ctx.font= h + "px " + font + " ,monospace";
    ctx.fillStyle = button.highlight();
    ctx.textAlign="left"; 
    ctx.textBaseline="middle"; 
    ctx.fillText( text, x + r * 1.5, y );
  };
  return button;
}

// Cog button object constructor.
var cogButton = function( x, y, r, f ) {
  // Construct base button.
  var button = baseButton( x, y, r, f );
  var baseDraw = button.draw;
  // Override draw fn.
  button.draw = function( ctx, scale ){
    // Delegate to base class draw.
    baseDraw( ctx, scale );

    ctx.fillStyle = button.highlight();
    // Truly oblique way of drawing a cog!!
    var n = 16;
    var a = [ r * 0.7, r * 0.5 ];
    ctx.beginPath();
    ctx.moveTo( Math.cos( 0 ) * a[0] + x, Math.sin( 0 ) * a[0] + y );
    ctx.lineTo( Math.cos( 0 ) * a[1] + x, Math.sin( 0 ) * a[1] + y );
    for( var i = 1; i < n; ) {
      var u = i * Math.PI * 2 / n;
      ctx.lineTo( Math.cos( u ) * a[i%2] + x, Math.sin( u ) * a[i%2] + y );
      ++i;
      ctx.lineTo( Math.cos( u ) * a[i%2] + x, Math.sin( u ) * a[i%2] + y );
    }
    ctx.closePath();
    ctx.fill();
    // The hole in the middle. 
    ctx.fillStyle = '#999999';
    drawCircle( ctx, x, y, r * 0.2 );
    ctx.fill();
  };
  return button;
}

// Base class button with speaker.
// muted is a function that returns the muted state when called with no
// arguments, and sets the muted state when called with one.

var speakerButton = function( x, y, text, h, muted ) {
  // Private data.
  var r = h * 0.5;
  // Construct base button.
  var button = labelButton( x, y, h, text, function(){
    muted( !muted() );
  } );
  var baseDraw = button.draw;
  // Override draw fn.
  button.draw = function( ctx, scale ){
    // Delegate to base class draw.
    baseDraw( ctx, scale );
   
    var a = 0;
    var d = r / 10;

    ctx.fillStyle = button.highlight();

    // Speaker.
    
    ctx.beginPath();
    ctx.moveTo( x + a - d * 6, y + a - d * 3 );
    ctx.lineTo( x + a - d * 6, y + a + d * 3 );
    ctx.lineTo( x + a - d * 4, y + a + d * 3 );
    ctx.lineTo( x + a - d * 4, y + a - d * 3 );
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo( x + a - d * 3, y + a - d * 3 );
    ctx.lineTo( x + a - d * 3, y + a + d * 3 );
    ctx.lineTo( x + a - d * 1, y + a + d * 6 );
    ctx.lineTo( x + a - d * 1, y + a - d * 6 );
    ctx.fill();

    // No.
    if( muted() ) { 
      var o = Math.sqrt( r * r * 0.5 );
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      ctx.moveTo( x + o, y - o );
      ctx.lineTo( x - o, y + o );
      ctx.stroke();
    }
  };

  return button;
}

// Button with speaker and sound wave things.

var soundButton = function( x, y, h, muted ) {
  // Private data.
  var r = h * 0.5;
  // Construct base button.
  var button = speakerButton( x, y, "Sound", h, muted );
  var baseDraw = button.draw;
  // Override draw fn.
  button.draw = function( ctx, scale ){
    // Delegate to base class draw.
    baseDraw( ctx, scale );
   
    var a = 0;
    var d = r / 10;

    // Sound.
    var b = r / 1.0;
    var d = r / 10;
    ctx.lineWidth = d;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.arc( x + a - d * 2, y + a, b * 0.8, -Math.PI * 0.3, +Math.PI * 0.3, false );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc( x + a - d * 2, y + a, b * 0.6, -Math.PI * 0.3, +Math.PI * 0.3, false );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc( x + a - d * 2, y + a, b * 0.4, -Math.PI * 0.3, +Math.PI * 0.3, false );
    ctx.stroke();

  };

  return button;
}

// Speaker button with a music note.

var musicButton = function( x, y, h, muted ) {
  // Private data.
  var r = h * 0.5;
  // Construct base button.
  var button = speakerButton( x, y, "Music", h, muted );
  var baseDraw = button.draw;
  // Override draw fn.
  button.draw = function( ctx, scale ){
    // Delegate to base class draw.
    baseDraw( ctx, scale );
   
    var a = 0;
    var b = r / 1.0;
    var d = r / 12;

    // Note.
    ctx.lineCap = "butt";
    ctx.lineWidth = d * 0.5;
    drawEllipseByCenter( ctx, x + a + d * 2, y + a + d * 2, d * 3, d * 2 );
    drawEllipseByCenter( ctx, x + a + d * 6, y + a + d * 2, d * 3, d * 2 );
    ctx.beginPath();
    ctx.moveTo( x + a + d * 3.5, y + a + d * 2 );
    ctx.lineTo( x + a + d * 3.5, y + a - d * 4 );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( x + a + d * 7.5, y + a + d * 2 );
    ctx.lineTo( x + a + d * 7.5, y + a - d * 4 );
    ctx.stroke();
    ctx.lineWidth = d * 1.5;
    ctx.beginPath();
    ctx.moveTo( x + a + d * 3.25, y + a - d * 4 );
    ctx.lineTo( x + a + d * 7.75, y + a - d * 4 );
    ctx.stroke();
  };

  return button;
}


