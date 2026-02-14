/**
 * Selected Track subpage configurations (v2)
 *
 * Now using extended schema with:
 * - perChannelMulti: Multiple bindings per channel
 * - fixedIndexBindings: Individual fixed-position bindings
 * - commandBindings: Non-value command bindings
 * - midiOutput: MIDI CC output on activation/deactivation
 */

import { BindingConfig } from '../bindingConfig';

// SendsQC subpage - per-channel sends + quick controls + fixed handy controls
export const SENDS_QC_CONFIG: BindingConfig = {
  id: 'sendsQC',
  name: 'SendsQC',
  description: 'Sends and quick controls',
  hostAccessor: 'selectedTrack',

  bindings: {
    // Per-channel multi-bindings (multiple surface→host per channel)
    perChannelMulti: [
      {
        id: 'sendsQCChannelControls',
        bindings: [
          {
            surface: 'encoder.mEncoderValue',
            hostValue: 'mSends.getByIndex(i).mLevel',
            options: {}
          },
          {
            surface: 'encoder.mPushValue',
            hostValue: 'mSends.getByIndex(i).mOn',
            options: { toggle: true }
          },
          {
            surface: 'scribbleStrip.trackTitle',
            hostValue: 'mFocusedQuickControls.getByIndex(i)',
            options: {}
          },
          {
            surface: 'fader.mSurfaceValue',
            hostValue: 'mFocusedQuickControls.getByIndex(i)',
            options: { takeOverMode: 'jump' },
            duplicate: true // Workaround for C12.0.60+ bug
          },
          {
            surface: 'buttons.select.mSurfaceValue',
            hostValue: 'mSends.getByIndex(i).mOn',
            options: { toggle: true }
          },
          {
            surface: 'buttons.mute.mSurfaceValue',
            hostValue: 'mSends.getByIndex(i).mPrePost',
            options: { toggle: true }
          }
        ]
      }
    ],

    // Fixed index bindings for handy controls (channels 4-7)
    fixedIndexBindings: [
      {
        id: 'sendQCCh0SoloEq',
        channelIndex: 0,
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mChannelEQ.mBand1.mOn',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh1SoloEq',
        channelIndex: 1,
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mChannelEQ.mBand2.mOn',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh2SoloEq',
        channelIndex: 2,
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mChannelEQ.mBand3.mOn',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh3SoloEq',
        channelIndex: 3,
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mChannelEQ.mBand4.mOn',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh4SoloCmd',
        channelIndex: 4,
        surface: 'buttons.solo.mSurfaceValue',
        command: {
          category: 'Automation',
          action: 'Show Used Automation (Selected Tracks)'
        }
      },
      {
        id: 'sendQCCh5SoloCmd',
        channelIndex: 5,
        surface: 'buttons.solo.mSurfaceValue',
        command: {
          category: 'Automation',
          action: 'Hide Automation'
        }
      },
      {
        id: 'sendQCCh6Solo',
        channelIndex: 6,
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mValue.mEditorOpen',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh7Solo',
        channelIndex: 7,
        surface: 'buttons.solo.mSurfaceValue',
        hostValue: 'mValue.mInstrumentOpen',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh4Record',
        channelIndex: 4,
        surface: 'buttons.record.mSurfaceValue',
        hostValue: 'mValue.mMonitorEnable',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh5Record',
        channelIndex: 5,
        surface: 'buttons.record.mSurfaceValue',
        hostValue: 'mValue.mMute',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh6Record',
        channelIndex: 6,
        surface: 'buttons.record.mSurfaceValue',
        hostValue: 'mValue.mSolo',
        options: { toggle: true }
      },
      {
        id: 'sendQCCh7Record',
        channelIndex: 7,
        surface: 'buttons.record.mSurfaceValue',
        hostValue: 'mValue.mRecordEnable',
        options: { toggle: true }
      }
    ],

    dummyChannelRanges: [
      {
        range: { start: 0, maxValue: 4 },
        bindings: ['buttons.record.mSurfaceValue']
      },
      {
        range: { start: 4, maxValue: 'device.numStrips' },
        bindings: ['buttons.solo.mSurfaceValue']
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "Sends QC" activated',
    globalVariables: [
      { name: 'refreshDisplay', action: 'toggle' }
    ],
    midiOutput: {
      onActivate: [
        { status: 0x90, data1: 0, data2: 0 },
        { status: 0x90, data1: 1, data2: 0 },
        { status: 0x90, data1: 2, data2: 0 },
        { status: 0x90, data1: 3, data2: 0 },
        { status: 0x90, data1: 0, data2: 127 }
      ],
      onDeactivate: [{ status: 0x90, data1: 0, data2: 0 }]
    }
  },

  displayBindings: {
    knobsBound: true,
    fadersBound: true
  },

  displayLineConfiguration: {
    line0Default: 'parameterName',
    line0Toggle: 'encoderValue',
    line1Default: 'faderValueTitle',
    line1Toggle: 'faderValue',
    toggleable: true
  }
};

// EQ subpage - 4-band EQ with dual controls per band
export const EQ_CONFIG: BindingConfig = {
  id: 'eq',
  name: 'EQ',
  description: '4-band equalizer with dual controls',
  hostAccessor: 'selectedTrack',

  bindings: {
    indexedChannels: {
      range: { start: 0, maxValue: 4 },
      bindings: [
        {
          surface: 'encoder.mEncoderValue',
          hostValue: 'mChannelEQ.mBand{i1}.mFilterType',
        },
        {
          surface: 'encoder.mEncoderValue',
          surfaceIndexOffset: 4,
          hostValue: 'mChannelEQ.mBand{i1}.mQ',
        },
        {
          surface: 'encoder.mPushValue',
          hostValue: 'mChannelEQ.mBand{i1}.mOn',
          options: { toggle: true },
        },
        {
          surface: 'encoder.mPushValue',
          surfaceIndexOffset: 4,
          hostValue: 'mChannelEQ.mBand{i1}.mOn',
          options: { toggle: true },
        },
        {
          surface: 'scribbleStrip.trackTitle',
          hostValue: 'mChannelEQ.mBand{i1}.mGain',
        },
        {
          surface: 'fader.mSurfaceValue',
          hostValue: 'mChannelEQ.mBand{i1}.mGain',
        },
        {
          surface: 'scribbleStrip.trackTitle',
          surfaceIndexOffset: 4,
          hostValue: 'mChannelEQ.mBand{i1}.mFreq',
        },
        {
          surface: 'fader.mSurfaceValue',
          surfaceIndexOffset: 4,
          hostValue: 'mChannelEQ.mBand{i1}.mFreq',
        },
        {
          surface: 'buttons.solo.mSurfaceValue',
          hostValue: 'mChannelEQ.mBand{i1}.mOn',
          options: { toggle: true },
        },
      ],
    },
    dummyChannelRanges: [
      {
        range: { start: 4, maxValue: 'device.numStrips' },
        bindings: ['buttons.solo.mSurfaceValue']
      },
      {
        range: { start: 0, maxValue: 'device.numStrips' },
        bindings: [
          'buttons.mute.mSurfaceValue',
          'buttons.select.mSurfaceValue',
          'buttons.record.mSurfaceValue'
        ]
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "EQ" activated',
    globalVariables: [
      { name: 'refreshDisplay', action: 'toggle' }
    ],
    midiOutput: {
      onActivate: [
        { status: 0x90, data1: 0, data2: 0 },
        { status: 0x90, data1: 1, data2: 0 },
        { status: 0x90, data1: 2, data2: 0 },
        { status: 0x90, data1: 3, data2: 0 },
        { status: 0x90, data1: 1, data2: 127 }
      ],
      onDeactivate: [{ status: 0x90, data1: 1, data2: 0 }]
    }
  },

  displayBindings: {
    knobsBound: true,
    fadersBound: true
  },

  displayLineConfiguration: {
    line0Default: 'parameterName',
    line0Toggle: 'encoderValue',
    line1Default: 'faderValueTitle',
    line1Toggle: 'faderValue',
    toggleable: true
  }
};

// CueSends subpage - variable-range cue sends
export const CUE_SENDS_CONFIG: BindingConfig = {
  id: 'cueSends',
  name: 'CueSends',
  description: 'Cue mix sends (variable range)',
  hostAccessor: 'selectedTrack',

  bindings: {
    variableChannels: {
      range: {
        start: 0,
        maxValue: 'device.numStrips',
        end: 'host.mCueSends.getSize()'
      },
      hostValueFactory: 'mCueSends.getByIndex(i)',
      bindings: [
        {
          id: 'cueSendPan',
          surface: 'encoder.mEncoderValue',
          hostValue: 'mPan',
          options: {}
        },
        {
          id: 'cueSendOn',
          surface: 'encoder.mPushValue',
          hostValue: 'mOn',
          options: { toggle: true }
        },
        {
          id: 'cueSendLevelTitle',
          surface: 'scribbleStrip.trackTitle',
          hostValue: 'mLevel',
          options: {}
        },
        {
          id: 'cueSendLevelFader',
          surface: 'fader.mSurfaceValue',
          hostValue: 'mLevel',
          options: {}
        },
        {
          id: 'cueSendSelect',
          surface: 'buttons.select.mSurfaceValue',
          hostValue: 'mOn',
          options: { toggle: true }
        },
        {
          id: 'cueSendPrePost',
          surface: 'buttons.mute.mSurfaceValue',
          hostValue: 'mPrePost',
          options: { toggle: true }
        }
      ],
      dummyBindings: [
        'encoder.mEncoderValue',
        'encoder.mPushValue',
        'scribbleStrip.trackTitle',
        'fader.mSurfaceValue',
        'buttons.select.mSurfaceValue',
        'buttons.mute.mSurfaceValue',
        'buttons.solo.mSurfaceValue',
        'buttons.record.mSurfaceValue'
      ],
      dummyRangeMax: 'device.numStrips'
    },
    dummyChannelRanges: [
      {
        range: { start: 0, maxValue: 'device.numStrips' },
        bindings: ['buttons.solo.mSurfaceValue', 'buttons.record.mSurfaceValue']
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "Cue Sends" activated',
    globalVariables: [
      { name: 'refreshDisplay', action: 'toggle' }
    ],
    midiOutput: {
      onActivate: [
        { status: 0x90, data1: 0, data2: 0 },
        { status: 0x90, data1: 1, data2: 0 },
        { status: 0x90, data1: 2, data2: 0 },
        { status: 0x90, data1: 3, data2: 0 },
        { status: 0x90, data1: 3, data2: 127 }
      ],
      onDeactivate: [{ status: 0x90, data1: 3, data2: 0 }]
    }
  },

  displayBindings: {
    knobsBound: true,
    fadersBound: true
  },

  displayLineConfiguration: {
    line0Default: 'parameterName',
    line0Toggle: 'encoderValue',
    line1Default: 'faderValueTitle',
    line1Toggle: 'faderValue',
    toggleable: true
  }
};

// PreFilter subpage - Input filter settings (fixed 3-channel)
export const PRE_FILTER_CONFIG: BindingConfig = {
  id: 'preFilter',
  name: 'PreFilter',
  description: 'Input filter settings',
  hostAccessor: 'selectedTrack',

  bindings: {
    fixedIndexBindings: [
      {
        id: 'preFltCh0Select',
        channelIndex: 0,
        surface: 'buttons.select.mSurfaceValue',
        hostValue: 'mPreFilter.mBypass',
        options: { toggle: true }
      },
      {
        id: 'preFltCh1Select',
        channelIndex: 1,
        surface: 'buttons.select.mSurfaceValue',
        hostValue: 'mPreFilter.mHighCutOn',
        options: { toggle: true }
      },
      {
        id: 'preFltCh2Select',
        channelIndex: 2,
        surface: 'buttons.select.mSurfaceValue',
        hostValue: 'mPreFilter.mLowCutOn',
        options: { toggle: true }
      },
      {
        id: 'preFltCh0Mute',
        channelIndex: 0,
        surface: 'buttons.mute.mSurfaceValue',
        hostValue: 'mPreFilter.mPhaseSwitch',
        options: { toggle: true }
      },
      {
        id: 'preFltCh0Encoder',
        channelIndex: 0,
        surface: 'encoder.mEncoderValue',
        hostValue: 'mPreFilter.mPhaseSwitch',
        options: {}
      },
      {
        id: 'preFltCh1Encoder',
        channelIndex: 1,
        surface: 'encoder.mEncoderValue',
        hostValue: 'mPreFilter.mHighCutSlope',
        options: {}
      },
      {
        id: 'preFltCh2Encoder',
        channelIndex: 2,
        surface: 'encoder.mEncoderValue',
        hostValue: 'mPreFilter.mLowCutSlope',
        options: {}
      },
      {
        id: 'preFltCh0EncoderPush',
        channelIndex: 0,
        surface: 'encoder.mPushValue',
        hostValue: 'mPreFilter.mBypass',
        options: { toggle: true }
      },
      {
        id: 'preFltCh1EncoderPush',
        channelIndex: 1,
        surface: 'encoder.mPushValue',
        hostValue: 'mPreFilter.mHighCutOn',
        options: { toggle: true }
      },
      {
        id: 'preFltCh2EncoderPush',
        channelIndex: 2,
        surface: 'encoder.mPushValue',
        hostValue: 'mPreFilter.mLowCutOn',
        options: { toggle: true }
      },
      {
        id: 'preFltCh0FaderTitle',
        channelIndex: 0,
        surface: 'scribbleStrip.trackTitle',
        hostValue: 'mPreFilter.mGain',
        options: {}
      },
      {
        id: 'preFltCh0Fader',
        channelIndex: 0,
        surface: 'fader.mSurfaceValue',
        hostValue: 'mPreFilter.mGain',
        options: {}
      },
      {
        id: 'preFltCh1FaderTitle',
        channelIndex: 1,
        surface: 'scribbleStrip.trackTitle',
        hostValue: 'mPreFilter.mHighCutFreq',
        options: {}
      },
      {
        id: 'preFltCh1Fader',
        channelIndex: 1,
        surface: 'fader.mSurfaceValue',
        hostValue: 'mPreFilter.mHighCutFreq',
        options: {}
      },
      {
        id: 'preFltCh2FaderTitle',
        channelIndex: 2,
        surface: 'scribbleStrip.trackTitle',
        hostValue: 'mPreFilter.mLowCutFreq',
        options: {}
      },
      {
        id: 'preFltCh2Fader',
        channelIndex: 2,
        surface: 'fader.mSurfaceValue',
        hostValue: 'mPreFilter.mLowCutFreq',
        options: {}
      }
    ],

    dummyChannelRanges: [
      {
        range: { start: 3, maxValue: 'device.numStrips' },
        bindings: ['buttons.select.mSurfaceValue']
      },
      {
        range: { start: 1, maxValue: 'device.numStrips' },
        bindings: ['buttons.mute.mSurfaceValue']
      },
      {
        range: { start: 0, maxValue: 'device.numStrips' },
        bindings: [
          'buttons.solo.mSurfaceValue',
          'buttons.record.mSurfaceValue'
        ]
      },
      {
        range: { start: 3, maxValue: 'device.numStrips' },
        bindings: [
          'encoder.mEncoderValue',
          'encoder.mPushValue',
          'fader.mSurfaceValue'
        ]
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "PreFilter" activated',
    globalVariables: [
      { name: 'refreshDisplay', action: 'toggle' }
    ],
    midiOutput: {
      onActivate: [
        { status: 0x90, data1: 0, data2: 0 },
        { status: 0x90, data1: 1, data2: 0 },
        { status: 0x90, data1: 2, data2: 0 },
        { status: 0x90, data1: 3, data2: 0 },
        { status: 0x90, data1: 2, data2: 127 }
      ],
      onDeactivate: [{ status: 0x90, data1: 2, data2: 0 }]
    }
  },

  displayBindings: {
    knobsBound: true,
    fadersBound: true
  },

  displayLineConfiguration: {
    line0Default: 'parameterName',
    line0Toggle: 'encoderValue',
    line1Default: 'faderValueTitle',
    line1Toggle: 'faderValue',
    toggleable: true
  }
};
