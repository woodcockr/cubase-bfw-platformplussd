/**
 * Mixer subpage configuration
 *
 * Defines bindings for the main mixer page with:
 * - Volume faders for all channels
 * - Pan control on encoders
 * - Editor open on encoder push
 * - Mute, solo, select, record buttons
 */

import { BindingConfig } from '../bindingConfig';

export const MIXER_CONFIG: BindingConfig = {
  id: 'mixer',
  name: 'Mixer',
  description: 'Track mixer with volume and pan controls',
  masterButton: 'subPageMixer',
  hostAccessor: 'hostMixerBankZone',

  bindings: {
    // Bindings applied to all channels
    perChannel: [
      {
        id: 'scribbleStripTitle',
        surface: 'scribbleStrip.trackTitle',
        hostValue: 'mValue.mVolume',
        options: {}
      },
      {
        id: 'encoderKnob',
        surface: 'encoder.mEncoderValue',
        hostValue: 'mValue.mPan',
        options: {}
      },
      {
        id: 'encoderPush',
        surface: 'encoder.mPushValue',
        hostValue: 'mValue.mEditorOpen',
        options: {
          toggle: true
        }
      },
      {
        id: 'fader',
        surface: 'fader.mSurfaceValue',
        hostValue: 'mValue.mVolume',
        options: {
          takeOverMode: 'jump'
        }
      },
      {
        id: 'selectButton',
        surface: 'buttons.select.mSurfaceValue',
        hostValue: 'mValue.mSelected',
        options: {
          toggle: true
        }
      },
      {
        id: 'muteButton',
        surface: 'buttons.mute.mSurfaceValue',
        hostValue: 'mValue.mMute',
        options: {
          toggle: true
        }
      },
      {
        id: 'soloButton',
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mValue.mSolo',
        options: {
          toggle: true
        }
      },
      {
        id: 'recordButton',
        surface: 'buttons.record.mSurfaceValue',
        hostValue: 'mValue.mRecordEnable',
        options: {
          toggle: true
        }
      }
    ],

    // No dummy bindings needed - all controls are used
    dummyBindings: []
  },

  activation: {
    logMessage: 'from script: Platform M+ page "Mixer" activated',
    globalVariables: [
      { name: 'displayChannelValueName', value: false },
      { name: 'displayParameterTitle', value: false },
      { name: 'areKnobsBound', value: false },
      { name: 'areFadersBound', value: false },
      { name: 'refreshDisplay', action: 'toggle' }
    ]
  }
};
