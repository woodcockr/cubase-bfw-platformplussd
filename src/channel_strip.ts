import { makePageWithDefaults } from "./master_controls"
import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { ActivationCallbacks } from "./midi/connection"
import { DecoratedFactoryMappingPage } from "./decorators/page"

export function makeSubPages(page: DecoratedFactoryMappingPage, faderSubPageArea: MR_SubPageArea, device: IconPlatformMplus, globalBooleanVariables: GlobalBooleanVariables, dummy: MR_HostValueVariable) {

    var gatePage = faderSubPageArea.makeSubPage('Gate')
    var compressorPage = faderSubPageArea.makeSubPage('Compressor')
    var toolsPage = faderSubPageArea.makeSubPage('Tools')
    var saturatorPage = faderSubPageArea.makeSubPage('Saturator')
    var limiterPage = faderSubPageArea.makeSubPage('Limiter')


    var selectedTrackChannel = page.mHostAccess.mTrackSelection.mMixerChannel
    var stripEffects = selectedTrackChannel.mInsertAndStripEffects.mStripEffects

    for (var idx = 0; idx < device.numStrips; ++idx) {
        var faderSurfaceValue = device.channelControls[idx].fader.mSurfaceValue;
        var trackTitle = device.channelControls[idx].scribbleStrip.trackTitle

        var gate = stripEffects.mGate.mParameterBankZone.makeParameterValue()
        var compressor = stripEffects.mCompressor.mParameterBankZone.makeParameterValue()
        var tools = stripEffects.mTools.mParameterBankZone.makeParameterValue()
        var saturator = stripEffects.mSaturator.mParameterBankZone.makeParameterValue()
        var limiter = stripEffects.mLimiter.mParameterBankZone.makeParameterValue()

        for (var i = 0; i < 2; i++) { // ! Workaround for Cubase 12.0.60+ bug
            page.makeValueBinding(faderSurfaceValue, gate).setSubPage(gatePage)
            page.makeValueBinding(faderSurfaceValue, compressor).setSubPage(compressorPage)
            page.makeValueBinding(faderSurfaceValue, tools).setSubPage(toolsPage)
            page.makeValueBinding(faderSurfaceValue, saturator).setSubPage(saturatorPage)
            page.makeValueBinding(faderSurfaceValue, limiter).setSubPage(limiterPage)
        }
        page.makeValueBinding(trackTitle, gate).setSubPage(gatePage)
        page.makeValueBinding(trackTitle, compressor).setSubPage(compressorPage)
        page.makeValueBinding(trackTitle, tools).setSubPage(toolsPage)
        page.makeValueBinding(trackTitle, saturator).setSubPage(saturatorPage)
        page.makeValueBinding(trackTitle, limiter).setSubPage(limiterPage)
    }

    // Dummy bindings to clear out any from other subpages for unused surface controls
    // NOTE: Only bind ONCE for a subPage. Do Not bind to dummy and then bind to a real control. That will not work.
    for (var i = 0; i < device.numStrips; ++i) {
        var knobSurfaceValue = device.channelControls[i].encoder.mEncoderValue;
        var knobPushValue = device.channelControls[i].encoder.mPushValue;

        page.makeValueBinding(knobSurfaceValue, dummy).setSubPage(gatePage);
        page.makeValueBinding(knobPushValue, dummy).setSubPage(gatePage);
        page.makeValueBinding(knobSurfaceValue, dummy).setSubPage(compressorPage);
        page.makeValueBinding(knobPushValue, dummy).setSubPage(compressorPage);
        page.makeValueBinding(knobSurfaceValue, dummy).setSubPage(toolsPage);
        page.makeValueBinding(knobPushValue, dummy).setSubPage(toolsPage);
        page.makeValueBinding(knobSurfaceValue, dummy).setSubPage(saturatorPage);
        page.makeValueBinding(knobPushValue, dummy).setSubPage(saturatorPage);
        page.makeValueBinding(knobSurfaceValue, dummy).setSubPage(limiterPage);
        page.makeValueBinding(knobPushValue, dummy).setSubPage(limiterPage);
    }

    for (var idx = 0; idx < 5; ++idx) {
        var faderStrip = device.channelControls[idx]
        var type = ['mGate', 'mCompressor', 'mTools', 'mSaturator', 'mLimiter'][idx] as keyof MR_HostStripEffectSlotFolder
        for (var i = 0; i < 2; i++) { // ! Workaround for Cubase 12.0.60+ bug
            page.makeValueBinding(faderStrip.buttons.record.mSurfaceValue, stripEffects[type].mOn).setSubPage(gatePage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.mute.mSurfaceValue, stripEffects[type].mBypass).setTypeToggle().setSubPage(gatePage)
            page.makeValueBinding(faderStrip.buttons.record.mSurfaceValue, stripEffects[type].mOn).setSubPage(compressorPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.mute.mSurfaceValue, stripEffects[type].mBypass).setTypeToggle().setSubPage(compressorPage)
            page.makeValueBinding(faderStrip.buttons.record.mSurfaceValue, stripEffects[type].mOn).setSubPage(toolsPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.mute.mSurfaceValue, stripEffects[type].mBypass).setTypeToggle().setSubPage(toolsPage)
            page.makeValueBinding(faderStrip.buttons.record.mSurfaceValue, stripEffects[type].mOn).setSubPage(saturatorPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.mute.mSurfaceValue, stripEffects[type].mBypass).setTypeToggle().setSubPage(saturatorPage)
            page.makeValueBinding(faderStrip.buttons.record.mSurfaceValue, stripEffects[type].mOn).setSubPage(limiterPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.mute.mSurfaceValue, stripEffects[type].mBypass).setTypeToggle().setSubPage(limiterPage)

            page.makeValueBinding(faderStrip.buttons.select.mSurfaceValue, dummy).setSubPage(gatePage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.solo.mSurfaceValue, dummy).setSubPage(gatePage)
            page.makeValueBinding(faderStrip.buttons.select.mSurfaceValue, dummy).setSubPage(compressorPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.solo.mSurfaceValue, dummy).setSubPage(compressorPage)
            page.makeValueBinding(faderStrip.buttons.select.mSurfaceValue, dummy).setSubPage(toolsPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.solo.mSurfaceValue, dummy).setSubPage(toolsPage)
            page.makeValueBinding(faderStrip.buttons.select.mSurfaceValue, dummy).setSubPage(saturatorPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.solo.mSurfaceValue, dummy).setSubPage(saturatorPage)
            page.makeValueBinding(faderStrip.buttons.select.mSurfaceValue, dummy).setSubPage(limiterPage) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.solo.mSurfaceValue, dummy).setSubPage(limiterPage)
        }
    }

    // Dummy bindings to clear out any from other subpages for unused surface controls
    // NOTE: Only bind ONCE for a subPage. Do Not bind to dummy and then bind to a real control. That will not work.
    for (var i = 5; i < device.numStrips; ++i) {
        page.makeValueBinding(device.channelControls[i].buttons.mute.mSurfaceValue, dummy).setSubPage(gatePage);
        page.makeValueBinding(device.channelControls[i].buttons.select.mSurfaceValue, dummy).setSubPage(gatePage);
        page.makeValueBinding(device.channelControls[i].buttons.solo.mSurfaceValue, dummy).setSubPage(gatePage);
        page.makeValueBinding(device.channelControls[i].buttons.record.mSurfaceValue, dummy).setSubPage(gatePage);
        page.makeValueBinding(device.channelControls[i].buttons.mute.mSurfaceValue, dummy).setSubPage(compressorPage);
        page.makeValueBinding(device.channelControls[i].buttons.select.mSurfaceValue, dummy).setSubPage(compressorPage);
        page.makeValueBinding(device.channelControls[i].buttons.solo.mSurfaceValue, dummy).setSubPage(compressorPage);
        page.makeValueBinding(device.channelControls[i].buttons.record.mSurfaceValue, dummy).setSubPage(compressorPage);
        page.makeValueBinding(device.channelControls[i].buttons.mute.mSurfaceValue, dummy).setSubPage(toolsPage);
        page.makeValueBinding(device.channelControls[i].buttons.select.mSurfaceValue, dummy).setSubPage(toolsPage);
        page.makeValueBinding(device.channelControls[i].buttons.solo.mSurfaceValue, dummy).setSubPage(toolsPage);
        page.makeValueBinding(device.channelControls[i].buttons.record.mSurfaceValue, dummy).setSubPage(toolsPage);
        page.makeValueBinding(device.channelControls[i].buttons.mute.mSurfaceValue, dummy).setSubPage(saturatorPage);
        page.makeValueBinding(device.channelControls[i].buttons.select.mSurfaceValue, dummy).setSubPage(saturatorPage);
        page.makeValueBinding(device.channelControls[i].buttons.solo.mSurfaceValue, dummy).setSubPage(saturatorPage);
        page.makeValueBinding(device.channelControls[i].buttons.record.mSurfaceValue, dummy).setSubPage(saturatorPage);
        page.makeValueBinding(device.channelControls[i].buttons.mute.mSurfaceValue, dummy).setSubPage(limiterPage);
        page.makeValueBinding(device.channelControls[i].buttons.select.mSurfaceValue, dummy).setSubPage(limiterPage);
        page.makeValueBinding(device.channelControls[i].buttons.solo.mSurfaceValue, dummy).setSubPage(limiterPage);
        page.makeValueBinding(device.channelControls[i].buttons.record.mSurfaceValue, dummy).setSubPage(limiterPage);
    }

    function resetSubPageLeds(activeDevice: MR_ActiveDevice) {
        // console.log('from script: Platform M+ page "Channel Strip" activated')
        globalBooleanVariables.displayChannelValueName.set(activeDevice, true)
        globalBooleanVariables.displayParameterTitle.set(activeDevice, true)
        globalBooleanVariables.areKnobsBound.set(activeDevice, false);
        globalBooleanVariables.areFadersBound.set(activeDevice, false);
        globalBooleanVariables.refreshDisplay.toggle(activeDevice); // Force display update in case there are no active bindings
        // ? Action Binding as a toggle would be nice to display led on subpage activation, but LED Button has other ideas and Action Bindings are not toggles.
        //   midiOutput.sendMidi(activeDevice, [0x90, 24, 127])
        //   midiOutput.sendMidi(activeDevice, [0x90, 25, 0])
        //   midiOutput.sendMidi(activeDevice, [0x90, 26, 0])
        //   midiOutput.sendMidi(activeDevice, [0x90, 27, 0])
        //   midiOutput.sendMidi(activeDevice, [0x90, 28, 0])
    }

    // ? Could add a custom display update here to add the name of the plugin which is active - it's the ChannelTitle or mOnChangePluginIdentity- but needs to be on the second line in the display
    gatePage.mOnActivate = (activeDevice) => {
        resetSubPageLeds(activeDevice)
        device.lcdManager.setTextLine(activeDevice, 0, "Gate")
    }
    compressorPage.mOnActivate = (activeDevice) => {
        resetSubPageLeds(activeDevice)
        device.lcdManager.setTextLine(activeDevice, 0, "Compressor")
    }
    toolsPage.mOnActivate = (activeDevice) => {
        resetSubPageLeds(activeDevice)
        device.lcdManager.setTextLine(activeDevice, 0, "Tools")
    }
    saturatorPage.mOnActivate = (activeDevice) => {
        resetSubPageLeds(activeDevice)
        device.lcdManager.setTextLine(activeDevice, 0, "Saturator")
    }
    limiterPage.mOnActivate = (activeDevice) => {
        resetSubPageLeds(activeDevice)
        device.lcdManager.setTextLine(activeDevice, 0, "Limiter")
    }

    // Stream Deck controls
    page.makeActionBinding(device.master.buttons.subPageGate .mSurfaceValue, gatePage.mAction.mActivate)
    page.makeActionBinding(device.master.buttons.subPageCompressor .mSurfaceValue, compressorPage.mAction.mActivate)
    page.makeActionBinding(device.master.buttons.subPageTools .mSurfaceValue, toolsPage.mAction.mActivate)
    page.makeActionBinding(device.master.buttons.subPageSaturator .mSurfaceValue, saturatorPage.mAction.mActivate)
    page.makeActionBinding(device.master.buttons.subPageLimiter .mSurfaceValue, limiterPage.mAction.mActivate)
}