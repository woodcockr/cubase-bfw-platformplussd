import { makePageWithDefaults } from "./master_controls"
import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { ActivationCallbacks } from "./midi/connection"

export function makePage(device: IconPlatformMplus, deviceDriver: MR_DeviceDriver, globalBooleanVariables: GlobalBooleanVariables, activationCallbacks: ActivationCallbacks) {
    var page = makePageWithDefaults('ChannelStrip', device, deviceDriver, globalBooleanVariables, activationCallbacks)

    var strip = page.makeSubPageArea('Strip')
    var gatePage = strip.makeSubPage('Gate')
    var compressorPage = strip.makeSubPage('Compressor')
    var toolsPage = strip.makeSubPage('Tools')
    var saturatorPage = strip.makeSubPage('Saturator')
    var limiterPage = strip.makeSubPage('Limiter')


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

    for (var idx = 0; idx < 5; ++idx) {
        var faderStrip = device.channelControls[idx]
        var type = ['mGate', 'mCompressor', 'mTools', 'mSaturator', 'mLimiter'][idx] as keyof MR_HostStripEffectSlotFolder
        for (var i = 0; i < 2; i++) { // ! Workaround for Cubase 12.0.60+ bug
            page.makeValueBinding(faderStrip.buttons.record.mSurfaceValue, stripEffects[type].mOn) // ? This doesn't work that well cause of MIDI Remote API.
            page.makeValueBinding(faderStrip.buttons.mute.mSurfaceValue, stripEffects[type].mBypass).setTypeToggle()
        }
    }

    page.makeActionBinding(device.channelControls[0].buttons.select.mSurfaceValue, gatePage.mAction.mActivate)
    page.makeActionBinding(device.channelControls[1].buttons.select.mSurfaceValue, compressorPage.mAction.mActivate)
    page.makeActionBinding(device.channelControls[2].buttons.select.mSurfaceValue, toolsPage.mAction.mActivate)
    page.makeActionBinding(device.channelControls[3].buttons.select.mSurfaceValue, saturatorPage.mAction.mActivate)
    page.makeActionBinding(device.channelControls[4].buttons.select.mSurfaceValue, limiterPage.mAction.mActivate)

    // ? Could add a custom display update here to add the name of the plugin which is active - it's the ChannelTitle or mOnChangePluginIdentity- but needs to be on the second line in the display
    gatePage.mOnActivate = (activeDevice) => {
        device.lcdManager.setTextLine(activeDevice, 0, "Gate")
    }
    compressorPage.mOnActivate = (activeDevice) => {
        device.lcdManager.setTextLine(activeDevice, 0, "Compressor")
    }
    toolsPage.mOnActivate = (activeDevice) => {
        device.lcdManager.setTextLine(activeDevice, 0, "Tools")
    }
    saturatorPage.mOnActivate = (activeDevice) => {
        device.lcdManager.setTextLine(activeDevice, 0, "Saturator")
    }
    limiterPage.mOnActivate = (activeDevice) => {
        device.lcdManager.setTextLine(activeDevice, 0, "Limiter")
    }

    page.mOnActivate = (activeDevice: MR_ActiveDevice) => {
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

    return page
}