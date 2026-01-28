import { makePageWithDefaults } from "./master_controls"
import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { ActivationCallbacks } from "./midi/connection"

export function makePage(device: IconPlatformMplus, deviceDriver: MR_DeviceDriver, globalBooleanVariables: GlobalBooleanVariables, activationCallbacks: ActivationCallbacks ) {
  var page = makePageWithDefaults('Mixer', device, deviceDriver, globalBooleanVariables, activationCallbacks)

  var FaderSubPageArea = page.makeSubPageArea('FadersKnobs')
  var subPageFaderVolume = FaderSubPageArea.makeSubPage('Volume')

  var ButtonSubPageArea = page.makeSubPageArea('Buttons')
  var subPageButtonDefaultSet = ButtonSubPageArea.makeSubPage('DefaultSet')

  var hostMixerBankZone = page.mHostAccess.mMixConsole.makeMixerBankZone("AudioInstrBanks")
      .setFollowVisibility(true)

  for (var channelIndex = 0; channelIndex < device.numStrips; ++channelIndex) {
      var hostMixerBankChannel = hostMixerBankZone.makeMixerBankChannel()

      var trackTitle = device.channelControls[channelIndex].scribbleStrip.trackTitle
      var knobSurfaceValue = device.channelControls[channelIndex].encoder.mEncoderValue;
      var knobPushValue = device.channelControls[channelIndex].encoder.mPushValue;
      var faderSurfaceValue = device.channelControls[channelIndex].fader.mSurfaceValue;
      var sel_buttonSurfaceValue = device.channelControls[channelIndex].buttons.select.mSurfaceValue;
      var mute_buttonSurfaceValue = device.channelControls[channelIndex].buttons.mute.mSurfaceValue;
      var solo_buttonSurfaceValue = device.channelControls[channelIndex].buttons.solo.mSurfaceValue;
      var rec_buttonSurfaceValue = device.channelControls[channelIndex].buttons.record.mSurfaceValue;

      // Scribble Strip
      page.makeValueBinding(trackTitle, hostMixerBankChannel.mValue.mVolume).setSubPage(subPageFaderVolume);
      // FaderKnobs - Volume, Pan, Editor Open
      page.makeValueBinding(knobSurfaceValue, hostMixerBankChannel.mValue.mPan).setSubPage(subPageFaderVolume)
      page.makeValueBinding(knobPushValue, hostMixerBankChannel.mValue.mEditorOpen).setTypeToggle().setSubPage(subPageFaderVolume)
      page.makeValueBinding(faderSurfaceValue, hostMixerBankChannel.mValue.mVolume).setValueTakeOverModeJump().setSubPage(subPageFaderVolume)
      page.makeValueBinding(faderSurfaceValue, hostMixerBankChannel.mValue.mVolume).setValueTakeOverModeJump().setSubPage(subPageFaderVolume) // ! Duplicate to overcome C12.0.60+ bug
      page.makeValueBinding(sel_buttonSurfaceValue, hostMixerBankChannel.mValue.mSelected).setTypeToggle().setSubPage(subPageButtonDefaultSet)
      page.makeValueBinding(mute_buttonSurfaceValue, hostMixerBankChannel.mValue.mMute).setTypeToggle().setSubPage(subPageButtonDefaultSet)
      page.makeValueBinding(solo_buttonSurfaceValue, hostMixerBankChannel.mValue.mSolo).setTypeToggle().setSubPage(subPageButtonDefaultSet)
      page.makeValueBinding(rec_buttonSurfaceValue, hostMixerBankChannel.mValue.mRecordEnable).setTypeToggle().setSubPage(subPageButtonDefaultSet)

  }

  page.mOnActivate = (activeDevice: MR_ActiveDevice) => {
      // console.log('from script: Platform M+ page "Mixer" activated')
      globalBooleanVariables.displayChannelValueName.set(activeDevice, false)
      globalBooleanVariables.displayParameterTitle.set(activeDevice, false)
      globalBooleanVariables.areKnobsBound.set(activeDevice, false);
      globalBooleanVariables.areFadersBound.set(activeDevice, false);
      globalBooleanVariables.refreshDisplay.toggle(activeDevice); // Force display update in case there are no active bindings
  }

  return page
}