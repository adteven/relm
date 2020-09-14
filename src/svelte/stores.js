import { writable } from 'svelte/store'

export default {
  editModalVisible: writable(false),
  identityModalVisible: writable(false),
  // TODO: make avatar modal use this state so we can choreograph initial experience
  selectAvatarModalVisible: writable(false),
  pressTabHelpVisible: writable(false),
  // A map of Jitsi conferenceIds to the player's participantId
  myJitsiParticipantIds: writable({}),
}
