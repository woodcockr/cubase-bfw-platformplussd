/**
 * MIDI CC subpage - Using BindingCreator with custom handlers
 *
 * This module uses BindingCreator for structure with custom handlers:
 * - Faders send MIDI CC messages
 * - Encoders change the CC number (0-127)
 * - Display shows CC title and current CC number
 *
 * Refactored approach:
 * - Uses MIDI_CONFIG for binding structure
 * - Custom fader handlers for MIDI output
 * - Custom encoder handlers for CC number selection
 * - Custom activation for LCD initialization showing CC numbers
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { LcdManager } from "./midi/LcdManager"
import { midi_cc } from "./config"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import { MIDI_CONFIG } from "./config/subpages/midi.config"

export function makeSubPages(
  page: DecoratedFactoryMappingPage,
  faderSubPageArea: any, // MR_SubPageArea
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  dummy: any // MR_HostValueVariable
) {
  const creator = new BindingCreator(page, device, dummy, globalBooleanVariables)

  // Store current CC numbers for each channel (initialized from config.ts defaults)
  const currentCCNumbers: number[] = midi_cc.map(cc => cc.cc)

  // Create custom config
  const customConfig = { ...MIDI_CONFIG }
  const faderBindings: any[] = []
  const encoderBindings: any[] = []

  // Create per-channel fader and encoder bindings
  for (let i = 0; i < device.numStrips; ++i) {
    const ccConfig = midi_cc[i]
    const displayName = LcdManager.centerString(
      LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(ccConfig.title))
    )

    // Create custom host variable for fader
    const hostVariable = page.mCustom.makeHostValueVariable(displayName)

    // Create fader binding with custom handler for MIDI output
    const valueBinding = page
      .makeValueBinding(
        device.channelControls[i].fader.mSurfaceValue,
        hostVariable
      )
      .setValueTakeOverModeJump()

    // Fader handler: send MIDI CC using current CC number
    valueBinding.mOnValueChange = (activeDevice: MR_ActiveDevice, mapping: any, value: number) => {
      const ccValue = Math.ceil(value * 127)

      // Send back to icon fader
      device.channelControls[i].fader.mSurfaceValue.setProcessValue(activeDevice, value)

      // Send MIDI CC only if fader is touched
      if (device.channelControls[i].fader.mTouchedValue.getProcessValue(activeDevice) === 1) {
        device.ccPortPair.output.sendMidi(activeDevice, [0xb0, currentCCNumbers[i], ccValue])
      }

      // Update display: CC number on row 1, value on row 0
      const ccDisplay = `CC${currentCCNumbers[i].toString().padStart(3, ' ')}`
      device.lcdManager.setChannelText(activeDevice, 1, i, ccDisplay)
      device.lcdManager.setChannelText(activeDevice, 0, i, ccValue.toString())
    }

    faderBindings.push(valueBinding)

    // Create encoder binding for CC number selection
    const encoderHostVariable = page.mCustom.makeHostValueVariable(`CC${i}`)
    const encoderBinding = page.makeValueBinding(
      device.channelControls[i].encoder.mEncoderValue,
      encoderHostVariable
    )

    // Encoder handler: use raw absolute value (0-127) from encoder
    encoderBinding.mOnValueChange = (activeDevice: MR_ActiveDevice, mapping: any, value: number) => {
      if (!globalBooleanVariables.isMidiCcPageActive.get(activeDevice)) {
        return;
      }

      const raw = Math.round(value * 127);
      currentCCNumbers[i] = Math.max(0, Math.min(127, raw))

      // Update display to show current CC number
      const ccDisplay = `CC${currentCCNumbers[i].toString().padStart(3, ' ')}`
      device.lcdManager.setChannelText(activeDevice, 1, i, ccDisplay)

      // Show current fader value on row 0
      const faderValue = device.channelControls[i].fader.mSurfaceValue.getProcessValue(activeDevice)
      const ccValue = Math.ceil(faderValue * 127)
      device.lcdManager.setChannelText(activeDevice, 0, i, ccValue.toString())
    }

    encoderBindings.push(encoderBinding)
  }

  // Create subpage using config (handles dummy bindings and structure)
  const subPageMIDICC = creator.createSubPageBindings(customConfig, faderSubPageArea)

  // Set subpage for all fader and encoder bindings
  faderBindings.forEach(binding => binding.setSubPage(subPageMIDICC))
  encoderBindings.forEach(binding => binding.setSubPage(subPageMIDICC))

  // Override activation handler for LCD initialization
  subPageMIDICC.mOnActivate = (activeDevice: MR_ActiveDevice, activeMapping: MR_ActiveMapping) => {
    console.log('from script: Platform M+ page "Midi" activated')

    globalBooleanVariables.isMidiCcPageActive.set(activeDevice, true);

    // Initialize LCD displays with CC numbers
    for (let i = 0; i < device.numStrips; ++i) {
      const ccDisplay = `CC${currentCCNumbers[i].toString().padStart(3, ' ')}`
      device.lcdManager.setChannelText(activeDevice, 1, i, ccDisplay)
      const faderValue = device.channelControls[i].fader.mSurfaceValue.getProcessValue(activeDevice)
      const ccValue = Math.ceil(faderValue * 127)
      device.lcdManager.setChannelText(activeDevice, 0, i, ccValue.toString())
    }

    // Restore indicators after LCD updates
    device.lcdManager.restoreCurrentIndicators(activeDevice)
  }

  // Deactivation handler to clear display
  subPageMIDICC.mOnDeactivate = (activeDevice: MR_ActiveDevice, activeMapping: MR_ActiveMapping) => {
    console.log('from script: Platform M+ page "Midi" deactivated')

    globalBooleanVariables.isMidiCcPageActive.set(activeDevice, false);

    // Clear channel text rows
    for (let i = 0; i < device.numStrips; ++i) {
      device.lcdManager.setChannelText(activeDevice, 1, i, '      ')  // 6 spaces
      device.lcdManager.setChannelText(activeDevice, 0, i, '      ')  // 6 spaces
    }
  }

  return subPageMIDICC;
}
