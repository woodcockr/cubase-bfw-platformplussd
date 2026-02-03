/**
 * Shift subpage configuration
 *
 * Defines bindings for additional functionality with:
 * - Select buttons selecting specific pages (manually bound in shift.ts)
 * - Mute 1 button toggling value display mode (manually bound in shift.ts)
 * - All other controls have dummy bindings
 */

import { BindingConfig } from '../bindingConfig';

export const SHIFT_PAGE_CONFIG: BindingConfig = {
  id: 'shift',
  name: 'Shift',
  description: 'Shift subpage with additional functionality',
  masterButton: 'subPageShift',

  bindings: {
    // Dummy bindings to clear ALL controls on ALL channels
    // Custom bindings for Select and Mute are handled manually in shift.ts
    dummyChannelRanges: [
      {
        range: {
          start: 0,
          maxValue: 'device.numStrips'
        },
        bindings: [
          'scribbleStrip.trackTitle',
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
      { name: 'areKnobsBound', value: false },
      { name: 'areFadersBound', value: false },
      { name: 'refreshDisplay', action: 'toggle' }
    ]
  }
};
