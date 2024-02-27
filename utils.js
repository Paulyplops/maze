



// Function checks that font is ready,
// probably just in process of loading.

var isFontReady = function() {
  // Record width of test string to check for missing font.
  var baselineText = "abcdefghijklmnopqrstuvwxyz0123456789";
  var baselineSize;

  return function( ctx, font ) {
    // Lazy initialisation.
    if(! baselineSize ) {
      ctx.font = "100px monospace";
      baselineSize = ctx.measureText( baselineText ).width;
    }

    ctx.font="100px " + font + " ,monospace";
    // Fall-back to see if we have fallen back to monospace.
    return baselineSize != ctx.measureText( baselineText ).width;
  }
}();



