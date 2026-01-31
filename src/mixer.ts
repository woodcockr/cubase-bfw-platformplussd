import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"

export function makeSubPages(page: DecoratedFactoryMappingPage, faderSubPageArea: MR_SubPageArea, device: IconPlatformMplus, globalBooleanVariables: GlobalBooleanVariables) {

  var subPageMixer = faderSubPageArea.makeSubPage('Mixer')

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
      page.makeValueBinding(trackTitle, hostMixerBankChannel.mValue.mVolume).setSubPage(subPageMixer);
      // FaderKnobs - Volume, Pan, Editor Open
      page.makeValueBinding(knobSurfaceValue, hostMixerBankChannel.mValue.mPan).setSubPage(subPageMixer)
      page.makeValueBinding(knobPushValue, hostMixerBankChannel.mValue.mEditorOpen).setTypeToggle().setSubPage(subPageMixer)
      page.makeValueBinding(faderSurfaceValue, hostMixerBankChannel.mValue.mVolume).setValueTakeOverModeJump().setSubPage(subPageMixer)
    // TODO  page.makeValueBinding(faderSurfaceValue, hostMixerBankChannel.mValue.mVolume).setValueTakeOverModeJump().setSubPage(subPageMixer) // ! Duplicate to overcome C12.0.60+ bug
      page.makeValueBinding(sel_buttonSurfaceValue, hostMixerBankChannel.mValue.mSelected).setTypeToggle().setSubPage(subPageMixer)
      page.makeValueBinding(mute_buttonSurfaceValue, hostMixerBankChannel.mValue.mMute).setTypeToggle().setSubPage(subPageMixer)
      page.makeValueBinding(solo_buttonSurfaceValue, hostMixerBankChannel.mValue.mSolo).setTypeToggle().setSubPage(subPageMixer)
      page.makeValueBinding(rec_buttonSurfaceValue, hostMixerBankChannel.mValue.mRecordEnable).setTypeToggle().setSubPage(subPageMixer)
  }

  subPageMixer.mOnActivate = (activeDevice: MR_ActiveDevice) => {
      console.log('from script: Platform M+ page "Mixer" activated')
      globalBooleanVariables.displayChannelValueName.set(activeDevice, false)
      globalBooleanVariables.displayParameterTitle.set(activeDevice, false)
      globalBooleanVariables.areKnobsBound.set(activeDevice, false);
      globalBooleanVariables.areFadersBound.set(activeDevice, false);
      globalBooleanVariables.refreshDisplay.toggle(activeDevice); // Force display update in case there are no active bindings
  }

  // Stream Deck controls
  page.makeActionBinding(device.master.buttons.subPageMixer.mSurfaceValue, subPageMixer.mAction.mActivate)

}