import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"

export function makeSubPages(page: DecoratedFactoryMappingPage, faderSubPageArea: MR_SubPageArea, device: IconPlatformMplus, globalBooleanVariables: GlobalBooleanVariables) {

  var controlRoom = page.mHostAccess.mControlRoom
  var subPageControlRoom = faderSubPageArea.makeSubPage('Control Room')

  // Main
  page.makeValueBinding(device.channelControls[0].scribbleStrip.trackTitle, controlRoom.mMainChannel.mLevelValue).setSubPage(subPageControlRoom);
  page.makeValueBinding(device.channelControls[0].fader.mSurfaceValue, controlRoom.mMainChannel.mLevelValue).setValueTakeOverModeJump().setSubPage(subPageControlRoom);
  page.makeValueBinding(device.channelControls[0].buttons.mute.mSurfaceValue, controlRoom.mMainChannel.mMuteValue).setTypeToggle().setSubPage(subPageControlRoom);
  page.makeValueBinding(device.channelControls[0].buttons.select.mSurfaceValue, controlRoom.mMainChannel.mMetronomeClickActiveValue).setTypeToggle().setSubPage(subPageControlRoom);
  // Phones[0]
  page.makeValueBinding(device.channelControls[1].scribbleStrip.trackTitle, controlRoom.getPhonesChannelByIndex(0).mLevelValue).setSubPage(subPageControlRoom);
  page.makeValueBinding(device.channelControls[1].fader.mSurfaceValue, controlRoom.getPhonesChannelByIndex(0).mLevelValue).setValueTakeOverModeJump().setSubPage(subPageControlRoom);
  page.makeValueBinding(device.channelControls[1].buttons.mute.mSurfaceValue, controlRoom.getPhonesChannelByIndex(0).mMuteValue).setTypeToggle().setSubPage(subPageControlRoom);
  page.makeValueBinding(device.channelControls[1].buttons.select.mSurfaceValue, controlRoom.getPhonesChannelByIndex(0).mMetronomeClickActiveValue).setTypeToggle().setSubPage(subPageControlRoom);


  // Reset bindings to dummy to clear out any from other subpages for any unused surface controls
  // NOTE: Only bind ONCE for a subPage. Do Not bind to dummy and then bind to a real control. That will not work.
  const dummy = page.mCustom.makeHostValueVariable("null");
  for (var i = 2; i < device.numStrips; ++i) {
    page.makeValueBinding(device.channelControls[i].scribbleStrip.trackTitle, dummy).setSubPage(subPageControlRoom);
    page.makeValueBinding(device.channelControls[i].fader.mSurfaceValue, dummy).setSubPage(subPageControlRoom);
    page.makeValueBinding(device.channelControls[i].buttons.mute.mSurfaceValue, dummy).setSubPage(subPageControlRoom);
    page.makeValueBinding(device.channelControls[i].buttons.select.mSurfaceValue, dummy).setSubPage(subPageControlRoom);
  }

  for (var i = 0; i < device.numStrips; ++i) {
    page.makeValueBinding(device.channelControls[i].buttons.solo.mSurfaceValue, dummy).setSubPage(subPageControlRoom);
    page.makeValueBinding(device.channelControls[i].buttons.record.mSurfaceValue, dummy).setSubPage(subPageControlRoom);
  }


  var maxCueSends = controlRoom.getMaxCueChannels() < 8 ? controlRoom.getMaxCueChannels() : 8

  for (var i = 0; i < maxCueSends; ++i) {
      var cueSend = controlRoom.getCueChannelByIndex(i)

      var knobSurfaceValue = device.channelControls[i].encoder.mEncoderValue;
      var knobPushValue = device.channelControls[i].encoder.mPushValue;

      page.makeValueBinding(knobSurfaceValue, cueSend.mLevelValue).setSubPage(subPageControlRoom);
      page.makeValueBinding(knobPushValue, cueSend.mMuteValue).setTypeToggle().setSubPage(subPageControlRoom);
  }
  for (var i = maxCueSends; i < 8; ++i) {
      var cueSend = controlRoom.getCueChannelByIndex(i)

      var knobSurfaceValue = device.channelControls[i].encoder.mEncoderValue;
      var knobPushValue = device.channelControls[i].encoder.mPushValue;

      page.makeValueBinding(knobSurfaceValue, dummy).setSubPage(subPageControlRoom);
      page.makeValueBinding(knobPushValue, dummy).setSubPage(subPageControlRoom);
  }

  subPageControlRoom.mOnActivate = (activeDevice: MR_ActiveDevice) => {
      console.log('from script: Platform M+ page "ControlRoom" activated')
      globalBooleanVariables.displayChannelValueName.set(activeDevice, false)
      globalBooleanVariables.displayParameterTitle.set(activeDevice, true)
      globalBooleanVariables.areKnobsBound.set(activeDevice, false);
      globalBooleanVariables.areFadersBound.set(activeDevice, false);
      globalBooleanVariables.refreshDisplay.toggle(activeDevice); // Force display update in case there are no active bindings
  }

  page.makeActionBinding(device.master.buttons.subPageControlRoom .mSurfaceValue, subPageControlRoom.mAction.mActivate)
}