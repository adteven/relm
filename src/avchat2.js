let connection = null;
let isJoined = false;
let room = null;

let localTracks = {};
const remoteMetadata = {};

let onConnectionSuccessWithContext;

let relmContext;

function initRemoteParticipant(participantId, tracksAdded = 0) {
  if (!remoteMetadata[participantId]) {
    remoteMetadata[participantId] = {
      trackIndex: -1,
      playerId: null,
    };
  }
  remoteMetadata[participantId].trackIndex += tracksAdded;
  return remoteMetadata[participantId];
}

function adjustVideoClasses(isVideo, isLocal, videoEl) {
  const circleEl = videoEl.parentElement;
  if (isVideo) {
    if (isLocal) {
      // Local camera should appear "flipped" horizontally, like when looking in a mirror
      videoEl.classList.add("mirror");
    }
  } else {
    if (isLocal) {
      // Screen sharing does not mirror
      videoEl.classList.remove("mirror");
    }
  }
}


async function attachLocalTrack(track, context) {
  track.addEventListener(
    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
    (audioLevel) => console.log(`Audio Level local: ${audioLevel}`)
  );
  track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
    console.log("Local track muted")
  );
  track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
    console.log("Local track stopped")
  );
  track.addEventListener(
    JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
    (deviceId) =>
      console.log(`Track audio output device was changed to ${deviceId}`)
  );

  switch (track.getType()) {
    case "audio":
      // Dispose old audio element, if it exists
      // if (localTracks.audio) {
      //   await localTracks.audio.dispose();
      //   console.log('disposing local audio track')
      // }
      
      // FIXME: once you share desktop, you can't mute audio because we have double audio tracks
      localTracks.audio = track;

      // const prevAudioElement = document.getElementById("local-audio");
      // if (prevAudioElement) {
      //   prevAudioElement.remove();
      // }

      // Create new audio element
      const audioElement = document.createElement("audio");
      audioElement.id = "local-audio";
      // audioElement.muted = true
      document.body.appendChild(audioElement);
      track.attach(audioElement);

      break;

    case "video":
      // Dispose old video element, if it exists
      if (localTracks.video) {
        await localTracks.video.dispose();
        console.log('disposing local video track')
      }
      localTracks.video = track;

      const prevVideoElement = document.getElementById("local-video");
      if (prevVideoElement) {
        prevVideoElement.remove();
      }

      // Create new video element
      const videoElement = context.createVideoElement(context.playerId);
      videoElement.id = "local-video";
      adjustVideoClasses(track.videoType === "camera", true, videoElement);
      track.attach(videoElement);

      break;

    default:
      console.warn(
        `Unknown track type, won't add: ${track.getType()}`,
        track
      );
  }
}

/**
 * Handles local tracks.
 * @param tracks Array with JitsiTrack objects
 */
function onLocalTracks(tracks, context) {
  for (const track of tracks) {

    attachLocalTrack(track, context);

    if (isJoined) {
      room.addTrack(track);
    }
  }
}

/**
 * Handles remote tracks
 * @param track JitsiTrack object
 */
function onRemoteTrack(track, context) {
  console.log(
    `onRemoteTrack (local? ${track.isLocal()})`,
    track.getType(),
    track.videoType
  );
  if (track.isLocal()) {
    return;
  }
  const participantId = track.getParticipantId();

  const participant = initRemoteParticipant(participantId, 1);

  track.addEventListener(
    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
    (audioLevel) => console.log(`Audio Level remote: ${audioLevel}`)
  );
  track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
    console.log("remote track muted")
  );
  track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
    console.log("remote track stoped")
  );
  track.addEventListener(
    JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
    (deviceId) =>
      console.log(`track audio output device was changed to ${deviceId}`)
  );
  if (context.onMuteChanged) {
    track.addEventListener(
      JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
      (track) => {
        context.onMuteChanged(track, participant.playerId);
      }
    );
  }

  const id = participantId + track.getType() + participant.trackIndex;

  if (track.getType() === "video") {
    console.log("create remote video track", participantId, id, participant);
    const videoElement = context.createVideoElement(participant.playerId);
    if (videoElement) {
      // NOTE: no need to append videoElement, it has already been added to video bubble
      videoElement.id = id;
      adjustVideoClasses(track.videoType === "camera", false, videoElement);
      track.attach(videoElement);
    } else {
      console.warn("Can't createVideoElement for remote player");
    }
  } else {
    const audioElement = document.createElement("audio");
    audioElement.id = id;
    audioElement.autoplay = true;
    document.body.appendChild(audioElement);
    track.attach(audioElement);
  }
}

/**
 * That function is executed when the conference is joined
 */
function onConferenceJoined() {
  console.log("conference joined!");
  isJoined = true;

  for (const track of Object.values(localTracks)) {
    console.log("onConferenceJoined add track", track);
    room.addTrack(track);
  }
}

function onUserJoined(participantId, participant) {
  console.log(
    `onUserJoined, particpant: ${participantId}`,
    participant,
    participant.getDisplayName()
  );
  initRemoteParticipant(participantId);
  if (participant.getDisplayName()) {
    remoteMetadata[participantId].playerId = participant.getDisplayName();
  }
}

/**
 *
 * @param id
 */
function onUserLeft(participant) {
  console.log("user left");
  if (!remoteMetadata[participant]) {
    return;
  }
  const tracks = remoteMetadata[participant];

  for (let i = 0; i < tracks.length; i++) {
    tracks[i].detach($(`#${id}${tracks[i].getType()}`));
  }
}

/**
 * That function is called when connection is established successfully
 */
function onConnectionSuccess(context) {
  room = window.room = connection.initJitsiConference(context.room, {
    openBridgeChannel: true,
  });

  // console.log('onConnectionSuccess', room)
  room.room.on("xmpp.video_type", (a, b) => {
    console.log("xmpp.video_type", a, b);
  });
  room.xmpp.on("xmpp.video_type", (a, b) => {
    console.log("xmpp.video_type2", a, b);
  });

  // Set playerId as name so that others can connect video to game player
  room.setDisplayName(context.playerId);

  room.on(JitsiMeetJS.events.conference.TRACK_ADDED, (track) =>
    onRemoteTrack(track, context)
  );
  room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track, a) => {
    console.log("track removed", track, a);
  });
  room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onConferenceJoined);
  room.on(JitsiMeetJS.events.conference.USER_JOINED, onUserJoined);
  room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
  room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
    console.log(`${track.getType()} - ${track.isMuted()}`);
  });
  room.on(
    JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
    (userID, displayName) => console.log(`${userID} - ${displayName}`)
  );
  room.on(
    JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
    (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`)
  );
  room.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
    console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`)
  );
  room.join();
}

/**
 * This function is called when the connection fail.
 */
function onConnectionFailed() {
  console.error("Connection Failed!");
}

/**
 * This function is called when the connection fail.
 */
function onDeviceListChanged(devices) {
  console.info("current devices", devices);
}

/**
 * This function is called when we disconnect.
 */
function disconnect() {
  console.log("disconnect!");
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccessWithContext
  );
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed
  );
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect
  );
}

/**
 *
 */
function unload() {
  for (const track of Object.values(localTracks)) {
    track.dispose();
  }
  room.leave();
  connection.disconnect();
}

let isVideo = true;

/**
 *
 */
async function switchVideo() {
  // eslint-disable-line no-unused-vars
  isVideo = !isVideo;
  try {
    const tracks = await JitsiMeetJS.createLocalTracks({
      devices: [isVideo ? "video" : "desktop"],
    })
    console.log("switchVideo createLocalTracks", tracks);
    for (const track of tracks) {
      await attachLocalTrack(track, relmContext);
      room.addTrack(track);
    }
  } catch (error) {
    console.log(`Unable to switchVideo`, error)
  }
  
  return isVideo;
}

/**
 *
 * @param selected
 */
function changeAudioOutput(selected) {
  // eslint-disable-line no-unused-vars
  JitsiMeetJS.mediaDevices.setAudioOutputDevice(selected.value);
}

async function initJitsiMeet(context) {
  $(window).bind("beforeunload", unload);
  $(window).bind("unload", unload);

  JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

  JitsiMeetJS.init({
    disableAudioLevels: true,
  });

  connection = new JitsiMeetJS.JitsiConnection(null, null, {
    hosts: {
      domain: "meet.jit.si",
      muc: "conference.meet.jit.si",
      focus: "focus.meet.jit.si",
    },
    externalConnectUrl: "https://meet.jit.si/http-pre-bind",
    enableP2P: true,
    p2p: {
      enabled: true,
      preferH264: true,
      disableH264: true,
      useStunTurn: true,
    },
    useStunTurn: true,
    bosh: `https://meet.jit.si/http-bind?room=${context.room}`,
    websocket: "wss://meet.jit.si/xmpp-websocket",
    clientNode: "http://jitsi.org/jitsimeet",
  });

  onConnectionSuccessWithContext = () => {
    onConnectionSuccess(context);
  };

  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccessWithContext
  );
  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed
  );
  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect
  );

  JitsiMeetJS.mediaDevices.addEventListener(
    JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
    onDeviceListChanged
  );

  connection.connect();

  JitsiMeetJS.createLocalTracks({ devices: ["audio", "video"] })
    .then((tracks) => onLocalTracks(tracks, context))
    .catch((error) => {
      throw error;
    });

  if (JitsiMeetJS.mediaDevices.isDeviceChangeAvailable("output")) {
    JitsiMeetJS.mediaDevices.enumerateDevices((devices) => {
      const audioOutputDevices = devices.filter(
        (d) => d.kind === "audiooutput"
      );

      if (audioOutputDevices.length > 1) {
        $("#audioOutputSelect").html(
          audioOutputDevices
            .map((d) => `<option value="${d.deviceId}">${d.label}</option>`)
            .join("\n")
        );

        $("#audioOutputSelectWrapper").show();
      }
    });
  }
}

function initializeAVChat(context) {
  relmContext = context;

  console.log("initialized with chat room", context.room);
  const intervalId = setInterval(() => {
    // Wait for JitsiMeetJS to be asynchronously, externally loaded
    if (window.JitsiMeetJS) {
      clearInterval(intervalId);
      JitsiMeetJS = window.JitsiMeetJS;
      initJitsiMeet(context);
      return;
    }
  }, 200);
}

function muteAudio() {
  if (!localTracks.audio) {
    console.warn("Can't mute audio, localTrack.audio not available");
    return;
  } else {
    localTracks.audio.mute();
  }
}

function unmuteAudio() {
  if (!localTracks.audio) {
    console.warn("Can't unmute audio, localTrack.audio not available");
    return;
  } else {
    localTracks.audio.unmute();
  }
}

export { initializeAVChat, muteAudio, unmuteAudio, switchVideo };
