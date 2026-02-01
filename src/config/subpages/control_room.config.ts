/**
 * Control Room subpage configuration
 *
 * Defines bindings for the control room page with:
 * - Main channel output level and mute
 * - Phones output level and metronome
 * - Cue send levels and mute (variable range)
 * - Dummy bindings for unused controls
 */

import { BindingConfig } from '../bindingConfig';

export const CONTROL_ROOM_CONFIG: BindingConfig = {
  id: 'controlRoom',
  name: 'Control Room',
  description: 'Control room with main, phones, and cue sends',
  masterButton: 'subPageControlRoom',
  hostAccessor: 'controlRoom',

  bindings: {
    // Fixed channel bindings for Main and Phones[0]
    fixedChannels: [
      {
        channelIndex: 0,
        bindings: [
          {
            id: 'mainTrackTitle',
            surface: 'scribbleStrip.trackTitle',
            hostValue: 'mMainChannel.mLevelValue',
            options: {}
          },
          {
            id: 'mainFader',
            surface: 'fader.mSurfaceValue',
            hostValue: 'mMainChannel.mLevelValue',
            options: {
              takeOverMode: 'jump'
            }
          },
          {
            id: 'mainMute',
            surface: 'buttons.mute.mSurfaceValue',
            hostValue: 'mMainChannel.mMuteValue',
            options: {
              toggle: true
            }
          },
          {
            id: 'mainMetronome',
            surface: 'buttons.select.mSurfaceValue',
            hostValue: 'mMainChannel.mMetronomeClickActiveValue',
            options: {
              toggle: true
            }
          }
        ]
      },
      {
        channelIndex: 1,
        bindings: [
          {
            id: 'phonesTrackTitle',
            surface: 'scribbleStrip.trackTitle',
            hostValue: 'getPhonesChannelByIndex(0).mLevelValue',
            options: {}
          },
          {
            id: 'phonesFader',
            surface: 'fader.mSurfaceValue',
            hostValue: 'getPhonesChannelByIndex(0).mLevelValue',
            options: {
              takeOverMode: 'jump'
            }
          },
          {
            id: 'phonesMute',
            surface: 'buttons.mute.mSurfaceValue',
            hostValue: 'getPhonesChannelByIndex(0).mMuteValue',
            options: {
              toggle: true
            }
          },
          {
            id: 'phonesMetronome',
            surface: 'buttons.select.mSurfaceValue',
            hostValue: 'getPhonesChannelByIndex(0).mMetronomeClickActiveValue',
            options: {
              toggle: true
            }
          }
        ]
      }
    ],

    // Variable range bindings for Cue sends
    variableChannels: {
      range: {
        start: 0,
        maxValue: 'controlRoom.getMaxCueChannels()'
      },
      hostValueFactory: 'getCueChannelByIndex(i)',
      bindings: [
        {
          id: 'cueEncoderKnob',
          surface: 'encoder.mEncoderValue',
          hostValue: 'mLevelValue',
          options: {}
        },
        {
          id: 'cueEncoderPush',
          surface: 'encoder.mPushValue',
          hostValue: 'mMuteValue',
          options: {
            toggle: true
          }
        }
      ]
    },

    // Dummy bindings to clear unused controls
    dummyChannelRanges: [
      {
        range: {
          start: 2,
          maxValue: 'device.numStrips'
        },
        bindings: [
          'scribbleStrip.trackTitle',
          'fader.mSurfaceValue',
          'buttons.mute.mSurfaceValue',
          'buttons.select.mSurfaceValue'
        ]
      },
      {
        range: {
          start: 0,
          maxValue: 'device.numStrips'
        },
        bindings: [
          'buttons.solo.mSurfaceValue',
          'buttons.record.mSurfaceValue'
        ]
      }
    ]
  },

  activation: {
    logMessage: 'from script: Platform M+ page "ControlRoom" activated',
    globalVariables: [
      { name: 'displayChannelValueName', value: false },
      { name: 'displayParameterTitle', value: true },
      { name: 'areKnobsBound', value: false },
      { name: 'areFadersBound', value: false },
      { name: 'refreshDisplay', action: 'toggle' }
    ]
  }
};
