/**
 * Channel Strip subpage configurations
 *
 * Five effect subpages: Gate, Compressor, Tools, Saturator, Limiter
 * Uses parameter bank zone values per channel with duplicate bindings
 * as a workaround for Cubase 12.0.60+.
 */

import { BindingConfig } from '../bindingConfig';

const EFFECT_TOGGLES = [
  { index: 0, effect: 'mGate' },
  { index: 1, effect: 'mCompressor' },
  { index: 2, effect: 'mTools' },
  { index: 3, effect: 'mSaturator' },
  { index: 4, effect: 'mLimiter' },
] as const;

function makeEffectConfig(effectKey: typeof EFFECT_TOGGLES[number]['effect'], name: string, buttonKey: string): BindingConfig {
  const fixedIndexBindings = EFFECT_TOGGLES.flatMap(({ index, effect }) => ([
    {
      id: `${effect}-record`,
      channelIndex: index,
      surface: 'buttons.record.mSurfaceValue',
      hostValue: `mStripEffects.${effect}.mOn`,
      options: { toggle: true },
      duplicate: true,
    },
    {
      id: `${effect}-mute`,
      channelIndex: index,
      surface: 'buttons.mute.mSurfaceValue',
      hostValue: `mStripEffects.${effect}.mBypass`,
      options: { toggle: true },
      duplicate: true,
    },
  ]));

  return {
    id: name.toLowerCase(),
    name,
    description: `${name} strip module`,
    masterButton: buttonKey,
    hostAccessor: 'selectedTrackStripEffects',

    bindings: {
      perChannelMulti: [
        {
          id: `${effectKey}-parameters`,
          bindings: [
            {
              surface: 'fader.mSurfaceValue',
              hostValue: `mStripEffects.${effectKey}.mParameterBankZone.makeParameterValue()`,
              hostValueKey: 'param',
              duplicate: true,
            },
            {
              surface: 'scribbleStrip.trackTitle',
              hostValue: `mStripEffects.${effectKey}.mParameterBankZone.makeParameterValue()`,
              hostValueKey: 'param',
            },
          ],
        },
      ],
      fixedIndexBindings,
      dummyChannelRanges: [
        {
          range: { start: 0, maxValue: 'device.numStrips' },
          bindings: [
            'encoder.mEncoderValue',
            'encoder.mPushValue',
            'buttons.select.mSurfaceValue',
            'buttons.solo.mSurfaceValue',
          ],
        },
        {
          range: { start: 5, maxValue: 'device.numStrips' },
          bindings: [
            'buttons.mute.mSurfaceValue',
            'buttons.record.mSurfaceValue',
          ],
        },
      ],
    },

    activation: {
      logMessage: `from script: Platform M+ page "${name}" activated`,
      globalVariables: [
        { name: 'displayChannelValueName', value: true },
        { name: 'displayParameterTitle', value: true },
        { name: 'areKnobsBound', value: false },
        { name: 'areFadersBound', value: false },
        { name: 'refreshDisplay', action: 'toggle' },
      ],
      lcdTextLine0: name,
    },
  };
}

export const GATE_CONFIG = makeEffectConfig('mGate', 'Gate', 'subPageGate');
export const COMPRESSOR_CONFIG = makeEffectConfig('mCompressor', 'Compressor', 'subPageCompressor');
export const TOOLS_CONFIG = makeEffectConfig('mTools', 'Tools', 'subPageTools');
export const SATURATOR_CONFIG = makeEffectConfig('mSaturator', 'Saturator', 'subPageSaturator');
export const LIMITER_CONFIG = makeEffectConfig('mLimiter', 'Limiter', 'subPageLimiter');
