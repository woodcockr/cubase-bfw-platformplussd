/**
 * MIDI CC subpage configuration
 *
 * Defines the dummy bindings for the MIDI CC page. The fader and encoder
 * bindings, MIDI output and LCD updates are created in midi.ts.
 */

import { BindingConfig } from '../bindingConfig';

export const MIDI_CONFIG: BindingConfig = {
  id: 'midiCC',
  name: 'MIDI CC',
  description: 'MIDI CC control - faders send CC, encoders select CC number',

  bindings: {
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
          'buttons.record.mSurfaceValue'
        ]
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "Midi" activated'
    // LCD initialization is handled in midi.ts
  },

  displayBindings: {
    knobsBound: false,
    fadersBound: false
  }
};
