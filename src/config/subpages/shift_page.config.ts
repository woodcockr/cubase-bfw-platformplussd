/**
 * Shift subpage configuration
 *
 * Defines bindings for additional functionality with:
 * - Select buttons selecting specific pages (manually bound in shift.ts)
 * - Record 1 button toggling value display mode (manually bound in shift.ts)
 * - Scribble strip titles display custom labels (managed in shift.ts mOnActivate)
 * - All other controls have dummy bindings to clear them
 */

import { BindingConfig } from '../bindingConfig';

export const SHIFT_PAGE_CONFIG: BindingConfig = {
  id: 'shift',
  name: 'Shift',
  description: 'Shift subpage with additional functionality',
  masterButton: 'subPageShift',

  bindings: {
    // Dummy bindings to clear unused controls on all channels
    // Note: scribbleStrip.trackTitle is NOT included here because we manage it
    // manually in shift.ts via mOnActivate to display custom label text
    dummyChannelRanges: [
      {
        range: {
          start: 0,
          maxValue: 'device.numStrips'
        },
        bindings: [
          'fader.mSurfaceValue',
          'encoder.mEncoderValue',
          'encoder.mPushValue',
          'buttons.mute.mSurfaceValue',
          'buttons.select.mSurfaceValue',
          'buttons.solo.mSurfaceValue',
          'buttons.record.mSurfaceValue'
        ]
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "Shift Page" activated',
    globalVariables: [
      { name: 'displayChannelValueName', value: false },
      { name: 'displayParameterTitle', value: true },
      { name: 'refreshDisplay', action: 'toggle' }
    ]
  },

  displayBindings: {
    knobsBound: false,
    fadersBound: false
  }
};
