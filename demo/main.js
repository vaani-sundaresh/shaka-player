// https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd

// https://storage.googleapis.com/shaka-demo-assets/sintel-widevine/dash.mpd
// https://cwip-shaka-proxy.appspot.com/no_auth

let manifestUri = '';
let streamType = 'dash';
function initShaka() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    // Everything looks good!
    initPlayer();
  } else {
    // This browser does not have the minimum set of APIs we need.
    console.error('Browser not supported!');
  }
}

async function loadStream() {
  try {
    if (streamType === 'dash') {
      manifestUri = document.getElementById('manifestUrlInput').value;
    } else {
      manifestUri = document.getElementById('mediaUrlInput').value;
      const keySystem = document.getElementById('keySystemList').value;
      const licenseServerUrl =
        document.getElementById('licenseServerUrlInput').value;
      const certArray = new Uint8Array('https://secure-media.hotstar.com/static/fairplay.cer');

      player.configure('drm.advanced.com\\.apple\\.fps\\.1_0.serverCertificate',certArray);

      player.configure({
        drm: {
          servers: {
            [keySystem]: licenseServerUrl,
            // certificateUrl: certificate || 'https://secure-media.hotstar.com/static/fairplay.cer'
          },
        },
      });
    }
    await player.load(manifestUri);
    // This runs if the asynchronous load is successful.
    displayMetadata();
  } catch (e) {
    // onError is executed if the asynchronous load fails.
    onError(e);
  }
}

function displayMetadata() {
  // Populate text tracks.
  const textTracksList = document.getElementById('textTracks');
  while (textTracksList.firstChild) {
    textTracksList.removeChild(textTracksList.firstChild);
  }
  const textTracks = player.getTextTracks();
  for (let i = 0; i < textTracks.length; ++i) {
    const track = textTracks[i];
    const item = document.createElement('option');
    item.textContent = 'language: ' + track.language;
    item.value = track.id;
    item.selected = track.active;
    if (track.enabled) {
      document.getElementById('textEnabled').checked = true;
    }
    textTracksList.appendChild(item);
  }

  const videoTracksList = document.getElementById('videoTracks');
  // clear old video tracks
  while (videoTracksList.firstChild) {
    videoTracksList.removeChild(videoTracksList.firstChild);
  }
  const videoTracks = player.getVariantTracks();
  for (let i = 0; i < videoTracks.length; ++i) {
    const track = videoTracks[i];
    const item = document.createElement('option');
    item.textContent = track.width + 'x' + track.height + ', ' +
                       track.bandwidth + ' bits/s';
    item.value = track.id;
    item.selected = track.active;
    videoTracksList.appendChild(item);
  }

  // Populate audio tracks.
  const audioTracksList = document.getElementById('audioTracks');
  while (audioTracksList.firstChild) {
    audioTracksList.removeChild(audioTracksList.firstChild);
  }
  const audioTracks = player.getAudioLanguages();
  for (let i = 0; i < audioTracks.length; ++i) {
    const track = audioTracks[i];
    const item = document.createElement('option');
    item.textContent = track;
    item.value = track;
    item.selected = track.active;
    audioTracksList.appendChild(item);
  }
}

function initApp() {
  document.getElementById('streamTypeList').addEventListener('change', onStreamTypeChange);
  document.getElementById('audioTracks').addEventListener('change', onAudioChange);
  document.getElementById('videoTracks').addEventListener('change', onVideoChange);
  document.getElementById('textTracks').addEventListener('change', onTextChange);
  document.getElementById('textEnabled').addEventListener('change', onTextChange);
  document.getElementById('loadButton').addEventListener('click', loadStream);
  initShaka();
  window.setInterval(updateDebugInfo, 50);
}

const onAudioChange = function(opt_clearBuffer) {
  const id = document.getElementById('audioTracks').value;
  player.selectAudioLanguage(id, opt_clearBuffer);
};

const onVideoChange = function(opt_clearBuffer) {
  const id = document.getElementById('videoTracks').value;
  const track = player.getVariantTracks().filter((track) => {
    return track.id == id;
  });
  player.configure({
    abr: {
      enabled: false,
    },
  });
  player.selectVariantTrack(track[0]);
};

const onTextChange = function() {
  if (!player) {
    return;
  }
  const id = document.getElementById('textTracks').value;
  const track = player.getTextTracks().filter((track) => {
    return track.id == id;
  });
  const enabled = document.getElementById('textEnabled').checked;
  player.setTextTrackVisibility(enabled);
  player.selectTextTrack(track[0]);
};


function parseTimerange(timerange) {
  if (timerange.length == 0) {
    return {start: 0, end: 0};
  } else {
    return {
      start: timerange.start(0),
      end: timerange.end(timerange.length-1),
    };
  }
}

function updateDebugInfo() {
  const bufEnd = document.getElementById('bufferedAheadDebug');
  const bufStart = document.getElementById('bufferedBehindDebug');
  const {start, end} = parseTimerange(video.buffered);

  bufStart.innerText = start;
  bufEnd.innerText = end;
}

async function initPlayer() {
  // Create a Player instance.
  const video = document.getElementById('video');
  const player = new shaka.Player(video);
  const videoContainer = document.getElementById('video-container');

  // Attach player to the window to make it easy to access in the JS console.
  player.configure({
    streaming: {
      rebufferingGoal: 6,
      bufferingGoal: 18,
      bufferBehind: 6,
    },
  });

  window.player = player;
  window.video = video;

  // Listen for error events.
  player.addEventListener('error', onErrorEvent);
}

function onErrorEvent(event) {
  // Extract the shaka.util.Error object from the event.
  onError(event.detail);
}

function onError(error) {
  // Log the error.
  console.error('Error code', error.code, 'object', error);
}

function onStreamTypeChange() {
  streamType = document.getElementById('streamTypeList').value;

  let on; let off;
  if (streamType == 'http') {
    on = document.querySelectorAll('.http');
    off = document.querySelectorAll('.dash');
  } else if (streamType == 'dash') {
    on = document.querySelectorAll('.dash');
    off = document.querySelectorAll('.http');
  }

  for (var i = 0; i < on.length; ++i) {
    on[i].style.display = 'table-row';
  }
  for (var i = 0; i < off.length; ++i) {
    off[i].style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
