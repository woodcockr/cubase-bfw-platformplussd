import { IconPlatformMplus  } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding";
import { ActivationCallbacks } from "./midi/connection"

// Mappings for the default areas - transport, zoom, knob
export function makePageWithDefaults(name: string, device: IconPlatformMplus, deviceDriver: MR_DeviceDriver, globalBooleanVariables: GlobalBooleanVariables, activationCallbacks: ActivationCallbacks ) : MR_FactoryMappingPage{
  var page = deviceDriver.mMapping.makePage(name)

  var jogSubPageArea = page.makeSubPageArea('Jog')
  var zoomSubPageArea = page.makeSubPageArea('Zoom')

  var subPageJogNudge = jogSubPageArea.makeSubPage('Nudge')
  subPageJogNudge.mOnActivate = (activeDevice) => {
    // console.log('Nudge activated')
    device.lcdManager.setIndicator2Text(activeDevice, 'N')
  }

  var subPageJogScrub = jogSubPageArea.makeSubPage('Scrub')
  subPageJogScrub.mOnActivate = (activeDevice) => {
    // console.log('Scrub activated')
    device.lcdManager.setIndicator2Text(activeDevice, 'S')
  }

  var subPageJogZoom = zoomSubPageArea.makeSubPage('Zoom')
  // subPageJogZoom.mOnActivate = (activeDevice)  => {
  //   // Need a way to manage the lack of ability to know this has turned off. Can the message be SENT to the Icon to esnure mode is correct?
  //   // console.log('Zoom activated')
  //   // device.lcdManager.setIndicator1Text(activeDevice, ' ')
  // }

  var subPageJobNav = zoomSubPageArea.makeSubPage('Nav')
  // subPageJobNav.mOnActivate = (activeDevice) => {
  //   // See Zoom comment
  //   // console.log('Nav activated')
  //   // device.lcdManager.setIndicator1Text(activeDevice, 'N')
  // }

  // Transport controls
  page.makeActionBinding(device.transport.buttons.prevChn.mSurfaceValue, deviceDriver.mAction.mPrevPage)
  page.makeActionBinding(device.transport.buttons.nextChn.mSurfaceValue, deviceDriver.mAction.mNextPage)
  page.makeCommandBinding(device.transport.buttons.prevBnk.mSurfaceValue, 'Transport', 'Locate Previous Marker')
  page.makeCommandBinding(device.transport.buttons.nextBnk.mSurfaceValue, 'Transport', 'Locate Next Marker')
  page.makeValueBinding(device.transport.buttons.forward.mSurfaceValue, page.mHostAccess.mTransport.mValue.mForward)
  page.makeValueBinding(device.transport.buttons.rewind.mSurfaceValue, page.mHostAccess.mTransport.mValue.mRewind)
  page.makeValueBinding(device.transport.buttons.start.mSurfaceValue, page.mHostAccess.mTransport.mValue.mStart).setTypeToggle()
  page.makeValueBinding(device.transport.buttons.stop.mSurfaceValue, page.mHostAccess.mTransport.mValue.mStop).setTypeToggle()
  page.makeValueBinding(device.transport.buttons.record.mSurfaceValue, page.mHostAccess.mTransport.mValue.mRecord).setTypeToggle()
  page.makeValueBinding(device.transport.buttons.cycle.mSurfaceValue, page.mHostAccess.mTransport.mValue.mCycleActive).setTypeToggle()

  // Zoom Pages - when either Zoom light is on
  page.makeCommandBinding(device.transport.buttons.zoomVertIn.mSurfaceValue, 'Zoom', 'Zoom In Vertically').setSubPage(subPageJogZoom)
  page.makeCommandBinding(device.transport.buttons.zoomVertOut.mSurfaceValue, 'Zoom', 'Zoom Out Vertically').setSubPage(subPageJogZoom)
  page.makeCommandBinding(device.transport.buttons.zoomHorizIn.mSurfaceValue, 'Zoom', 'Zoom In').setSubPage(subPageJogZoom)
  page.makeCommandBinding(device.transport.buttons.zoomHorizOut.mSurfaceValue, 'Zoom', 'Zoom Out').setSubPage(subPageJogZoom)
  // Nav Pages
  page.makeActionBinding(device.transport.buttons.zoomVertIn.mSurfaceValue, page.mHostAccess.mTrackSelection.mAction.mNextTrack).setSubPage(subPageJobNav)
  page.makeActionBinding(device.transport.buttons.zoomVertOut.mSurfaceValue, page.mHostAccess.mTrackSelection.mAction.mPrevTrack).setSubPage(subPageJobNav)
  page.makeCommandBinding(device.transport.buttons.zoomHorizIn.mSurfaceValue, 'Transport', 'Locate Next Event').setSubPage(subPageJobNav)
  page.makeCommandBinding(device.transport.buttons.zoomHorizOut.mSurfaceValue, 'Transport', 'Locate Previous Event').setSubPage(subPageJobNav)
  // Switch Zoom and Nav via simultaneous press of Zoom buttons
  page.makeActionBinding(device.transport.buttons.zoomOnOff.mSurfaceValue, zoomSubPageArea.mAction.mNext)

  // Jog Pages - when Zoom lights are off
  // Nudge
  page.makeCommandBinding(device.transport.jog_wheel.mJogLeftValue, 'Transport', 'Nudge Cursor Left').setSubPage(subPageJogNudge)
  page.makeCommandBinding(device.transport.jog_wheel.mJogRightValue, 'Transport', 'Nudge Cursor Right').setSubPage(subPageJogNudge)
  // Scrub (Jog in Cubase)
  page.makeCommandBinding(device.transport.jog_wheel.mJogLeftValue, 'Transport', 'Jog Left').setSubPage(subPageJogScrub)
  page.makeCommandBinding(device.transport.jog_wheel.mJogRightValue, 'Transport', 'Jog Right').setSubPage(subPageJogScrub)
  // Switch between Nudge and Scrub by tapping knob
  page.makeActionBinding(device.transport.jog_wheel.mPushValue, jogSubPageArea.mAction.mNext)


  var MasterFaderSubPageArea = page.makeSubPageArea('MasterFader')
  var subPageMasterFaderValue = MasterFaderSubPageArea.makeSubPage('MF_ValueUnderCursor')

  page.makeValueBinding(device.master.fader.mSurfaceValue, page.mHostAccess.mMouseCursor.mValueUnderMouse).setValueTakeOverModeJump().setSubPage(subPageMasterFaderValue)

  // Automation for selected tracks
  var selectedTrackChannel = page.mHostAccess.mTrackSelection.mMixerChannel

  // Automation for selected tracks
  page.makeValueBinding(device.master.buttons.read.mSurfaceValue, selectedTrackChannel.mValue.mAutomationRead).setTypeToggle()
  page.makeValueBinding(device.master.buttons.write.mSurfaceValue, selectedTrackChannel.mValue.mAutomationWrite).setTypeToggle()

  // Mixer Button
  page
    .makeValueBinding(
      device.master.buttons.mixer.mSurfaceValue,
      page.mCustom.makeHostValueVariable("Display Name/Value")
    )
    .mOnValueChange = (context, mapping, value) => {
    if (value) {
      globalBooleanVariables.isValueDisplayModeActive.toggle(context);
    }
  };
  return page
}