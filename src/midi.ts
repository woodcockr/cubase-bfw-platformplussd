/**
 * MIDI CC subpage - Using BindingCreator with custom handlers
 *
 * - Faders send MIDI CC messages (only while touched)
 * - Encoders select the CC number for their channel (one CC per detent, 0-127);
 *   the selection is temporary and resets to the configured CC on reload
 * - Row 1 (bottom) shows the CC name, row 0 (top) shows the fader value (or the CC number
 *   while the encoder is being turned)
 *
 * Channel assignments come from the user-editable midi-cc-config.js shipped
 * beside the driver; errors fall back to the built-in defaults.
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { LcdManager } from "./midi/LcdManager"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import { MIDI_CONFIG } from "./config/subpages/midi.config"
import { getDisplayTitle, loadMidiCcConfig, stepCcNumber } from "./midi/MidiCcConfig"
import { logDebug, logInfo } from "./logger"

function lcdName(title: string) {
  return LcdManager.centerString(
    LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(title))
  )
}

function lcdCcNumber(cc: number) {
  return `CC${cc.toString().padStart(3, ' ')}`
}

export function makeSubPages(
  page: DecoratedFactoryMappingPage,
  faderSubPageArea: any, // MR_SubPageArea
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  dummy: any // MR_HostValueVariable
) {
  const creator = new BindingCreator(page, device, dummy, globalBooleanVariables)

  // midi-cc-config.js is not bundled; it is loaded from beside the driver script.
  const ccConfig = loadMidiCcConfig(() => require("./midi-cc-config"), logInfo)

  // Current (temporary) CC selection for each channel
  const currentCCNumbers: number[] = ccConfig.map(channel => channel.cc)

  const showChannel = (activeDevice: MR_ActiveDevice, i: number) => {
    device.lcdManager.setChannelText(activeDevice, 1, i, lcdName(getDisplayTitle(ccConfig[i], currentCCNumbers[i])))
    const faderValue = device.channelControls[i].fader.mSurfaceValue.getProcessValue(activeDevice)
    device.lcdManager.setChannelText(activeDevice, 0, i, Math.ceil(faderValue * 127).toString())
  }

  // Create custom config
  const customConfig = { ...MIDI_CONFIG }
  const faderBindings: any[] = []
  const encoderBindings: any[] = []

  // Create per-channel fader and encoder bindings
  for (let i = 0; i < device.numStrips; ++i) {
    // Create custom host variable for fader
    const hostVariable = page.mCustom.makeHostValueVariable(lcdName(ccConfig[i].title))

    // Create fader binding with custom handler for MIDI output
    const valueBinding = page
      .makeValueBinding(
        device.channelControls[i].fader.mSurfaceValue,
        hostVariable
      )
      .setValueTakeOverModeJump()

    // Fader handler: send MIDI CC using current CC number
    valueBinding.mOnValueChange = (activeDevice: MR_ActiveDevice, _mapping: any, value: number) => {
      const ccValue = Math.ceil(value * 127)

      // Send back to icon fader
      device.channelControls[i].fader.mSurfaceValue.setProcessValue(activeDevice, value)

      // Send MIDI CC only if fader is touched
      if (device.channelControls[i].fader.mTouchedValue.getProcessValue(activeDevice) === 1) {
        device.ccPortPair.output.sendMidi(activeDevice, [0xb0, currentCCNumbers[i], ccValue])
      }

      if (globalBooleanVariables.isMidiCcPageActive.get(activeDevice)) {
        device.lcdManager.setChannelText(activeDevice, 1, i, lcdName(getDisplayTitle(ccConfig[i], currentCCNumbers[i])))
        device.lcdManager.setChannelText(activeDevice, 0, i, ccValue.toString())
      }
    }

    faderBindings.push(valueBinding)

    // Create encoder binding for CC number selection
    const encoderHostVariable = page.mCustom.makeHostValueVariable(`CC${i}`)
    const encoderBinding = page.makeValueBinding(
      device.channelControls[i].encoder.mEncoderValue,
      encoderHostVariable
    )

    // Encoder handler: the encoder is relative, so step one CC per detent and
    // recentre the local value before it reaches either end of its range.
    encoderBinding.mOnValueChange = (activeDevice: MR_ActiveDevice, _mapping: any, value: number, difference: number) => {
      if (!globalBooleanVariables.isMidiCcPageActive.get(activeDevice)) {
        return;
      }
      // Ignore the jump caused by our own recentring.
      if (!isFinite(difference) || difference === 0 || Math.abs(difference) > 0.25) {
        return;
      }

      currentCCNumbers[i] = stepCcNumber(currentCCNumbers[i], difference)

      if (value < 0.1 || value > 0.9) {
        device.channelControls[i].encoder.mEncoderValue.setProcessValue(activeDevice, 0.5)
      }

      device.lcdManager.setChannelText(activeDevice, 1, i, lcdName(getDisplayTitle(ccConfig[i], currentCCNumbers[i])))
      device.lcdManager.setChannelText(activeDevice, 0, i, lcdCcNumber(currentCCNumbers[i]))
    }

    encoderBindings.push(encoderBinding)
  }

  // Create subpage using config (handles dummy bindings and structure)
  const subPageMIDICC = creator.createSubPageBindings(customConfig, faderSubPageArea)

  // Set subpage for all fader and encoder bindings
  faderBindings.forEach(binding => binding.setSubPage(subPageMIDICC))
  encoderBindings.forEach(binding => binding.setSubPage(subPageMIDICC))

  // Override activation handler for LCD initialization
  subPageMIDICC.mOnActivate = (activeDevice: MR_ActiveDevice, _activeMapping: MR_ActiveMapping) => {
    // Set current page ID in global state
    const pageId = 'midicc';
    globalBooleanVariables.currentPageId.set(activeDevice, pageId);

    // Initialize page in DisplayStateManager and set as active
    device.displayStateManager.initializePage(pageId);
    device.displayStateManager.setActivePage(activeDevice, pageId);

    logDebug('from script: Platform M+ page "Midi" activated')

    globalBooleanVariables.isMidiCcPageActive.set(activeDevice, true);

    // Initialize LCD displays with CC names and fader values
    for (let i = 0; i < device.numStrips; ++i) {
      showChannel(activeDevice, i)
    }

    // Restore indicators after LCD updates
    device.lcdManager.restoreCurrentIndicators(activeDevice)
  }

  // Deactivation handler to clear display
  subPageMIDICC.mOnDeactivate = (activeDevice: MR_ActiveDevice, _activeMapping: MR_ActiveMapping) => {
    logDebug('from script: Platform M+ page "Midi" deactivated')

    globalBooleanVariables.isMidiCcPageActive.set(activeDevice, false);

    // Clear channel text rows
    for (let i = 0; i < device.numStrips; ++i) {
      device.lcdManager.setChannelText(activeDevice, 1, i, '      ')  // 6 spaces
      device.lcdManager.setChannelText(activeDevice, 0, i, '      ')  // 6 spaces
    }
  }

  return subPageMIDICC;
}
