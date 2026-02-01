/**
 * MIDI CC subpage - Using BindingCreator with custom handlers
 *
 * This module uses BindingCreator for structure but adds custom handlers
 * for MIDI output since this requires device-specific logic.
 *
 * Refactored approach:
 * - Uses MIDI_CONFIG for binding structure
 * - Extends bindings with custom mOnValueChange handlers
 * - Custom activation for LCD initialization
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

  // Create custom config with per-channel host variables
  const customConfig = { ...MIDI_CONFIG }
  const bindings: any[] = []

  // Create per-channel bindings with custom host variables and handlers
  for (let i = 0; i < device.numStrips; ++i) {
    const ccConfig = midi_cc[i]
    const displayName = LcdManager.centerString(
      LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(ccConfig.title))
    )

    // Create custom host variable for this channel
    const hostVariable = page.mCustom.makeHostValueVariable(displayName)

    // Create binding manually to attach custom handler
    const valueBinding = page
      .makeValueBinding(
        device.channelControls[i].fader.mSurfaceValue,
        hostVariable
      )
      .setValueTakeOverModeJump()

    // Attach custom handler for MIDI output
    valueBinding.mOnValueChange = (activeDevice: MR_ActiveDevice, mapping: any, value: number) => {
      const ccValue = Math.ceil(value * 127)
      const pitchBendValue = Math.ceil(value * 16383)
      const val1 = pitchBendValue % 128
      const val2 = Math.floor(pitchBendValue / 128)

      // Send back to icon fader
      device.channelControls[i].fader.mSurfaceValue.setProcessValue(activeDevice, value)

      // Send MIDI CC only if fader is touched
      if (device.channelControls[i].fader.mTouchedValue.getProcessValue(activeDevice) === 1) {
        device.ccPortPair.output.sendMidi(activeDevice, [0xb0, ccConfig.cc, ccValue])
      }

      // Update display
      device.lcdManager.setChannelText(activeDevice, 1, i, displayName)
      device.lcdManager.setChannelText(activeDevice, 0, i, ccValue.toString())
    }

    bindings.push(valueBinding)
  }

  // Create subpage using config (handles dummy bindings and structure)
  const subPageMIDICC = creator.createSubPageBindings(customConfig, faderSubPageArea)

  // Set subpage for all custom bindings
  bindings.forEach(binding => binding.setSubPage(subPageMIDICC))

  // Override activation handler completely for LCD initialization
  // (replaces the one from BindingCreator to avoid closure issues)
  subPageMIDICC.mOnActivate = (activeDevice: MR_ActiveDevice, activeMapping: MR_ActiveMapping) => {
    console.log('from script: Platform M+ page "Midi" activated')

    // Initialize LCD displays
    for (let i = 0; i < device.numStrips; ++i) {
      const displayName = LcdManager.centerString(
        LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(midi_cc[i].title))
      )
      device.lcdManager.setChannelText(activeDevice, 1, i, displayName)
      device.lcdManager.setChannelText(activeDevice, 0, i, '?')
    }

    // Restore indicators after LCD updates
    device.lcdManager.restoreCurrentIndicators(activeDevice)
  }

  // Add deactivation handler to preserve LCD state when exiting this subpage
  // This prevents blank display when switching to other subpages
  subPageMIDICC.mOnDeactivate = (activeDevice: MR_ActiveDevice, activeMapping: MR_ActiveMapping) => {
    console.log('from script: Platform M+ page "Midi" deactivated')

    // Clear only the channel text rows (0 and 1) that were modified by this subpage
    // This prepares for the next subpage to initialize its own display cleanly
    // Note: Indicator1Text and Indicator2Text are preserved (status letters like N/S/Z)
    for (let i = 0; i < device.numStrips; ++i) {
      device.lcdManager.setChannelText(activeDevice, 1, i, '      ')  // 6 spaces
      device.lcdManager.setChannelText(activeDevice, 0, i, '      ')  // 6 spaces
    }
  }
}