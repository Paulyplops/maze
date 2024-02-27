// Audio

function pause(millis)
 {
  var date = new Date();
  var curDate = null;
  do { curDate = new Date(); }
  while(curDate-date < millis);
}

var loadAudio = function( name ){
  var audio = new Audio;

  if( audio.canPlayType('audio/mp3;')) {
    audio.type = 'audio/mp3';
    audio.src = name + '.mp3';
    audio.preload = 'auto';
  } 

  audio.mute = false;

  return audio;
}


var fadeIn = function( audio, time ) {
  var louder = function( ) {
    if( audio.volume < 0.9 && !audio.mute ) {
      var v = audio.volume;
      audio.volume += 0.1;
      if( v != audio.volume ) {
        // On IOS volume is a read-only property.
        window.setTimeout( louder, time * 100 );
      }
    }
  }

  audio.currentTime = 0;
  audio.volume = 0;
  audio.play();
  louder( audio );
}

var fadeOut = function( audio, time ) {
  var quieter = function( ) {
    if( audio.volume > 0.1 ) {
      var v = audio.volume;
      audio.volume -= 0.1;
      if( v != audio.volume ) {
        window.setTimeout( quieter, time * 100 );
      } else {
        // On IOS the volume property is read-only.
        // Halt playing immediately.
        audio.pause();
      }
    } else {
      audio.pause();
    }
  }

  quieter( audio );
}

var mute = function( audio ) {
  audio.volume = 0;
  audio.mute = true;
}

var unmute = function( audio ) {
  audio.mute = false;
  if( !audio.paused ) 
    audio.volume = 1;
}





