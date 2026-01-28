import { makePageWithDefaults } from "./master_controls"
import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { ActivationCallbacks } from "./midi/connection"

export function makePage(device: IconPlatformMplus, deviceDriver: MR_DeviceDriver, globalBooleanVariables: GlobalBooleanVariables, activationCallbacks: ActivationCallbacks) {
    var page = makePageWithDefaults('Selected Channel', device, deviceDriver, globalBooleanVariables, activationCallbacks)

    var faderSubPageArea = page.makeSubPageArea('Faders')
    var subPageSendsQC = faderSubPageArea.makeSubPage('SendsQC')
    var subPageEQ = faderSubPageArea.makeSubPage('EQ')
    var subPageCueSends = faderSubPageArea.makeSubPage('CueSends')
    var subPagePreFilter = faderSubPageArea.makeSubPage('PreFilter')

    var selectedTrackChannel = page.mHostAccess.mTrackSelection.mMixerChannel

    /// SendsQC subPage
    // Sends on PushEncoders and mute button for pre/post
    // Focus QC on Faders
    // Fader
    for (var idx = 0; idx < device.numStrips; ++idx) {
        var knobSurfaceValue = device.channelControls[idx].encoder.mEncoderValue;
        var knobPushValue = device.channelControls[idx].encoder.mPushValue;
        var trackTitle = device.channelControls[idx].scribbleStrip.trackTitle
        var faderSurfaceValue = device.channelControls[idx].fader.mSurfaceValue;

        var quickControlValue = page.mHostAccess.mFocusedQuickControls.getByIndex(idx) // ! Weird: If this isn't a var in the line below but a direct call then Cubase will not bind values correctly
        var sends = selectedTrackChannel.mSends.getByIndex(idx)


        page.makeValueBinding(knobSurfaceValue, sends.mLevel).setSubPage(subPageSendsQC)
        page.makeValueBinding(knobPushValue, sends.mOn).setTypeToggle().setSubPage(subPageSendsQC)
        // Scribble Strip
        page.makeValueBinding(trackTitle, quickControlValue).setSubPage(subPageSendsQC);
        // Fader
        page.makeValueBinding(faderSurfaceValue, quickControlValue).setValueTakeOverModeJump().setSubPage(subPageSendsQC)
        page.makeValueBinding(faderSurfaceValue, quickControlValue).setValueTakeOverModeJump().setSubPage(subPageSendsQC) // ! Duplicate to overcome C12.0.60+ bug

        page.makeValueBinding(device.channelControls[idx].buttons.select.mSurfaceValue, selectedTrackChannel.mSends.getByIndex(idx).mOn).setTypeToggle().setSubPage(subPageSendsQC)
        page.makeValueBinding(device.channelControls[idx].buttons.mute.mSurfaceValue, selectedTrackChannel.mSends.getByIndex(idx).mPrePost).setTypeToggle().setSubPage(subPageSendsQC)

    }

    // Handy controls for easy access
    page.makeCommandBinding(device.channelControls[4].buttons.solo.mSurfaceValue, 'Automation', 'Show Used Automation (Selected Tracks)').setSubPage(subPageSendsQC)
    page.makeCommandBinding(device.channelControls[5].buttons.solo.mSurfaceValue, 'Automation', 'Hide Automation').setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[6].buttons.solo.mSurfaceValue, selectedTrackChannel.mValue.mEditorOpen).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[7].buttons.solo.mSurfaceValue, selectedTrackChannel.mValue.mInstrumentOpen).setTypeToggle().setSubPage(subPageSendsQC)

    page.makeValueBinding(device.channelControls[4].buttons.record.mSurfaceValue, selectedTrackChannel.mValue.mMonitorEnable).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[5].buttons.record.mSurfaceValue, selectedTrackChannel.mValue.mMute).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[6].buttons.record.mSurfaceValue, selectedTrackChannel.mValue.mSolo).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[7].buttons.record.mSurfaceValue, selectedTrackChannel.mValue.mRecordEnable).setTypeToggle().setSubPage(subPageSendsQC)

    // EQ Related but on Sends page so you know EQ activated...not sure the best option but hey, more buttons and lights is cool!
    page.makeValueBinding(device.channelControls[0].buttons.solo.mSurfaceValue, selectedTrackChannel.mChannelEQ.mBand1.mOn).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[1].buttons.solo.mSurfaceValue, selectedTrackChannel.mChannelEQ.mBand2.mOn).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[2].buttons.solo.mSurfaceValue, selectedTrackChannel.mChannelEQ.mBand3.mOn).setTypeToggle().setSubPage(subPageSendsQC)
    page.makeValueBinding(device.channelControls[3].buttons.solo.mSurfaceValue, selectedTrackChannel.mChannelEQ.mBand4.mOn).setTypeToggle().setSubPage(subPageSendsQC)

    page.makeActionBinding(device.channelControls[0].buttons.record.mSurfaceValue, subPageSendsQC.mAction.mActivate).setSubPage(subPageSendsQC)
    page.makeActionBinding(device.channelControls[1].buttons.record.mSurfaceValue, subPageEQ.mAction.mActivate).setSubPage(subPageSendsQC)
    page.makeActionBinding(device.channelControls[2].buttons.record.mSurfaceValue, subPagePreFilter.mAction.mActivate).setSubPage(subPageSendsQC)
    page.makeActionBinding(device.channelControls[3].buttons.record.mSurfaceValue, subPageCueSends.mAction.mActivate).setSubPage(subPageSendsQC)

    // EQ Subpage
    const eqBand = []
    eqBand[0] = selectedTrackChannel.mChannelEQ.mBand1
    eqBand[1] = selectedTrackChannel.mChannelEQ.mBand2
    eqBand[2] = selectedTrackChannel.mChannelEQ.mBand3
    eqBand[3] = selectedTrackChannel.mChannelEQ.mBand4
    for (var idx = 0; idx < 4; ++idx) {
        var knobSurfaceValue = device.channelControls[idx].encoder.mEncoderValue;
        var knob2SurfaceValue = device.channelControls[idx + 4].encoder.mEncoderValue;
        var knobPushValue = device.channelControls[idx].encoder.mPushValue;
        var knob2PushValue = device.channelControls[idx + 4].encoder.mPushValue;
        var trackTitle1 = device.channelControls[idx].scribbleStrip.trackTitle
        var faderSurfaceValue = device.channelControls[idx].fader.mSurfaceValue;
        var trackTitle2 = device.channelControls[idx + 4].scribbleStrip.trackTitle
        var fader2SurfaceValue = device.channelControls[idx + 4].fader.mSurfaceValue;

        page.makeValueBinding(knobSurfaceValue, eqBand[idx].mFilterType).setSubPage(subPageEQ)
        page.makeValueBinding(knob2SurfaceValue, eqBand[idx].mQ).setSubPage(subPageEQ)
        page.makeValueBinding(knobPushValue, eqBand[idx].mOn).setTypeToggle().setSubPage(subPageEQ)
        page.makeValueBinding(knob2PushValue, eqBand[idx].mOn).setTypeToggle().setSubPage(subPageEQ)
        page.makeValueBinding(trackTitle1, eqBand[idx].mGain).setSubPage(subPageEQ);
        page.makeValueBinding(faderSurfaceValue, eqBand[idx].mGain).setSubPage(subPageEQ)
        page.makeValueBinding(trackTitle2, eqBand[idx].mFreq).setSubPage(subPageEQ);
        page.makeValueBinding(fader2SurfaceValue, eqBand[idx].mFreq).setSubPage(subPageEQ)
    }

    /// CueSends subPage
    for (var idx = 0; idx < selectedTrackChannel.mCueSends.getSize(); ++idx) {
        var knobSurfaceValue = device.channelControls[idx].encoder.mEncoderValue;
        var knobPushValue = device.channelControls[idx].encoder.mPushValue;
        var trackTitle = device.channelControls[idx].scribbleStrip.trackTitle;
        var faderSurfaceValue = device.channelControls[idx].fader.mSurfaceValue;

        page.makeValueBinding(knobSurfaceValue, selectedTrackChannel.mCueSends.getByIndex(idx).mPan).setSubPage(subPageCueSends)
        page.makeValueBinding(knobPushValue, selectedTrackChannel.mCueSends.getByIndex(idx).mOn).setTypeToggle().setSubPage(subPageCueSends)
        page.makeValueBinding(trackTitle, selectedTrackChannel.mCueSends.getByIndex(idx).mLevel).setSubPage(subPageCueSends);
        page.makeValueBinding(faderSurfaceValue, selectedTrackChannel.mCueSends.getByIndex(idx).mLevel).setSubPage(subPageCueSends)

        page.makeValueBinding(device.channelControls[idx].buttons.select.mSurfaceValue, selectedTrackChannel.mCueSends.getByIndex(idx).mOn).setTypeToggle().setSubPage(subPageCueSends)
        page.makeValueBinding(device.channelControls[idx].buttons.mute.mSurfaceValue, selectedTrackChannel.mCueSends.getByIndex(idx).mPrePost).setTypeToggle().setSubPage(subPageCueSends)
    }

    // PreFilter subPage
    var knobSurfaceValue = device.channelControls[0].encoder.mEncoderValue;
    var knob2SurfaceValue = device.channelControls[1].encoder.mEncoderValue;
    var knob3SurfaceValue = device.channelControls[2].encoder.mEncoderValue;

    var knobPushValue = device.channelControls[0].encoder.mPushValue;
    var knob2PushValue = device.channelControls[1].encoder.mPushValue;
    var knob3PushValue = device.channelControls[2].encoder.mPushValue;

    var faderSurfaceValue = device.channelControls[0].fader.mSurfaceValue;
    var fader2SurfaceValue = device.channelControls[1].fader.mSurfaceValue;
    var fader3SurfaceValue = device.channelControls[2].fader.mSurfaceValue;

    var preFilter = selectedTrackChannel.mPreFilter

    page.makeValueBinding(device.channelControls[0].buttons.select.mSurfaceValue, preFilter.mBypass).setTypeToggle().setSubPage(subPagePreFilter)
    page.makeValueBinding(device.channelControls[0].buttons.mute.mSurfaceValue, preFilter.mPhaseSwitch).setTypeToggle().setSubPage(subPagePreFilter)

    page.makeValueBinding(device.channelControls[1].buttons.select.mSurfaceValue, preFilter.mHighCutOn).setTypeToggle().setSubPage(subPagePreFilter)
    page.makeValueBinding(device.channelControls[2].buttons.select.mSurfaceValue, preFilter.mLowCutOn).setTypeToggle().setSubPage(subPagePreFilter)

    page.makeValueBinding(knobSurfaceValue, preFilter.mPhaseSwitch ).setSubPage(subPagePreFilter) // ? No way to remove a valueBinding that is on another subpage? Duplicate yes but nothing else to set it too
    page.makeValueBinding(knob2SurfaceValue, preFilter.mHighCutSlope).setSubPage(subPagePreFilter)
    page.makeValueBinding(knob3SurfaceValue, preFilter.mLowCutSlope).setSubPage(subPagePreFilter)

    page.makeValueBinding(knobPushValue, preFilter.mBypass).setTypeToggle().setSubPage(subPagePreFilter)
    page.makeValueBinding(knob2PushValue, preFilter.mHighCutOn).setTypeToggle().setSubPage(subPagePreFilter)
    page.makeValueBinding(knob3PushValue, preFilter.mLowCutOn).setTypeToggle().setSubPage(subPagePreFilter)

    page.makeValueBinding(device.channelControls[0].scribbleStrip.trackTitle,  preFilter.mGain).setSubPage(subPagePreFilter);
    page.makeValueBinding(faderSurfaceValue, preFilter.mGain).setSubPage(subPagePreFilter)
    page.makeValueBinding(device.channelControls[1].scribbleStrip.trackTitle,  preFilter.mHighCutFreq).setSubPage(subPagePreFilter);
    page.makeValueBinding(fader2SurfaceValue, preFilter.mHighCutFreq).setSubPage(subPagePreFilter)
    page.makeValueBinding(device.channelControls[2].scribbleStrip.trackTitle, preFilter.mLowCutFreq).setSubPage(subPagePreFilter);
    page.makeValueBinding(fader3SurfaceValue, preFilter.mLowCutFreq).setSubPage(subPagePreFilter)

    page.mOnActivate =  (activeDevice) => {
        // console.log('from script: Platform M+ page "Selected Track" activated')
        // Set the Rec leds which correspond to the different subages to their starting state
        globalBooleanVariables.displayChannelValueName.set(activeDevice, true)
        globalBooleanVariables.displayParameterTitle.set(activeDevice, true)
        globalBooleanVariables.areKnobsBound.set(activeDevice, false);
        globalBooleanVariables.areFadersBound.set(activeDevice, false);
        globalBooleanVariables.refreshDisplay.toggle(activeDevice); // Force display update in case there are no active bindings
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 0, 127])
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 1, 0])
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 2, 0])
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 3, 0])
    }
    // ? Action binding is not a toggle and LedButton - wants to turn the light off on release
    subPageSendsQC.mOnActivate = (activeDevice) => {
        globalBooleanVariables.displayChannelValueName.set(activeDevice, true)
        globalBooleanVariables.displayParameterTitle.set(activeDevice, true)
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 0, 127])
    }
    subPageSendsQC.mOnDeactivate = (activeDevice) => {
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 0, 0])
    }
    subPageEQ.mOnActivate = (activeDevice) => {
        globalBooleanVariables.displayChannelValueName.set(activeDevice, true)
        globalBooleanVariables.displayParameterTitle.set(activeDevice, false)
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 1, 127])
    }
    subPageEQ.mOnDeactivate = (activeDevice) => {
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 1, 0])
    }
    subPagePreFilter.mOnActivate = (activeDevice) => {
        globalBooleanVariables.displayChannelValueName.set(activeDevice, true)
        globalBooleanVariables.displayParameterTitle.set(activeDevice, false)
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 2, 127])
    }
    subPagePreFilter.mOnDeactivate = (activeDevice) => {
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 2, 0])
    }
    subPageCueSends.mOnActivate = (activeDevice) => {
        globalBooleanVariables.displayChannelValueName.set(activeDevice, false)
        globalBooleanVariables.displayParameterTitle.set(activeDevice, false)
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 3, 127])
    }
    subPageCueSends.mOnDeactivate = (activeDevice) => {
        device.midiPortPair.output.sendMidi(activeDevice, [0x90, 3, 0])
    }

    return page
}