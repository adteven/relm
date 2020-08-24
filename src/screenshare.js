import { switchVideo } from './avchat2.js'

function toggleScreenShare(stage) {
  switchVideo().then((isCamera) => {
    stage.player.goals.video.update({ cam: isCamera })
  })
}

export { toggleScreenShare }
