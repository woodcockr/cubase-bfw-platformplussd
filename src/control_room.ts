import { makePageWithDefaults } from "./master_controls"
import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { ActivationCallbacks } from "./midi/connection"

export function makePage(device: IconPlatformMplus, deviceDriver: MR_DeviceDriver, globalBooleanVariables: GlobalBooleanVariables, activationCallbacks: ActivationCallbacks ) {
  var page = makePageWithDefaults('ControlRoom', device, deviceDriver, globalBooleanVariables, activationCallbacks)

  var controlRoom = page.mHostAccess.mControlRoom

  // Main
  page.makeValueBinding(device.channelControls[0].scribbleStrip.trackTitle, controlRoom.mMainChannel.mLevelValue);
  page.makeValueBinding(device.channelControls[0].fader.mSurfaceValue, controlRoom.mMainChannel.mLevelValue).setValueTakeOverModeJump()
  page.makeValueBinding(device.channelControls[0].buttons.mute.mSurfaceValue, controlRoom.mMainChannel.mMuteValue).setTypeToggle()
  page.makeValueBinding(device.channelControls[0].buttons.select.mSurfaceValue, controlRoom.mMainChannel.mMetronomeClickActiveValue).setTypeToggle()
  // Phones[0]
  page.makeValueBinding(device.channelControls[1].scribbleStrip.trackTitle, controlRoom.getPhonesChannelByIndex(0).mLevelValue);
  page.makeValueBinding(device.channelControls[1].fader.mSurfaceValue, controlRoom.getPhonesChannelByIndex(0).mLevelValue).setValueTakeOverModeJump()
  page.makeValueBinding(device.channelControls[1].buttons.mute.mSurfaceValue, controlRoom.getPhonesChannelByIndex(0).mMuteValue).setTypeToggle()
  page.makeValueBinding(device.channelControls[1].buttons.select.mSurfaceValue, controlRoom.getPhonesChannelByIndex(0).mMetronomeClickActiveValue).setTypeToggle()

  var maxCueSends = controlRoom.getMaxCueChannels() < 8 ? controlRoom.getMaxCueChannels() : 8

  for (var i = 0; i < maxCueSends; ++i) {
      var cueSend = controlRoom.getCueChannelByIndex(i)

      var knobSurfaceValue = device.channelControls[i].encoder.mEncoderValue;
      var knobPushValue = device.channelControls[i].encoder.mPushValue;

      page.makeValueBinding(knobSurfaceValue, cueSend.mLevelValue)
      page.makeValueBinding(knobPushValue, cueSend.mMuteValue).setTypeToggle()

  }

  page.mOnActivate = (activeDevice: MR_ActiveDevice) => {
      console.log('from script: Platform M+ page "ControlRoom" activated')
      globalBooleanVariables.displayChannelValueName.set(activeDevice, false)
      globalBooleanVariables.displayParameterTitle.set(activeDevice, true)
      globalBooleanVariables.areKnobsBound.set(activeDevice, false);
      globalBooleanVariables.areFadersBound.set(activeDevice, false);
      globalBooleanVariables.refreshDisplay.toggle(activeDevice); // Force display update in case there are no active bindings
  }

  return page
}