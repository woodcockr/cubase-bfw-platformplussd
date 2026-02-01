/**
 * MIDI CC subpage configuration
 *
 * Defines bindings for MIDI CC control with custom handlers.
 * The MIDI CC page uses faders to send MIDI CC messages with custom
 * value change handlers for MIDI output and LCD display updates.
 */

import { BindingConfig } from '../bindingConfig';

export const MIDI_CONFIG: BindingConfig = {
  id: 'midiCC',
  name: 'MIDI CC',
  description: 'MIDI CC control with per-channel custom handlers',
  masterButton: 'subPageMIDICC',

  bindings: {
    // Per-channel bindings - Note: custom handlers are applied in midi.ts
    // since they require access to device-specific MIDI output
    perChannel: [
      {
        id: 'midiCCFader',
        surface: 'fader.mSurfaceValue',
        hostValue: 'customVariable', // Marker for custom host variable creation
        options: {
          takeOverMode: 'jump'
        }
      }
    ],

    // Dummy bindings to clear unused controls
    dummyChannelRanges: [
      {
        range: {
          start: 0,
          maxValue: 'device.numStrips'
        },
        bindings: [
          'buttons.mute.mSurfaceValue',
          'buttons.select.mSurfaceValue',
          'buttons.solo.mSurfaceValue',
          'buttons.record.mSurfaceValue',
          'encoder.mEncoderValue',
          'encoder.mPushValue'
        ]
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "Midi" activated'
    // Note: LCD initialization is handled in midi.ts since it requires
    // access to midi_cc config and LcdManager
  }
};
