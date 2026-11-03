/**
 * MIDI CC names used by the MIDI CC page.
 *
 * Orchestral library conventions take precedence over the generic MIDI 1.0
 * names (https://midi.org/midi-1-0-control-change-messages). Undefined
 * controllers fall back to `CC<number>`.
 */

export const orchestralCcNames: Record<number, string> = {
  1: "Dynamics",
  2: "Breath",
  7: "Volume",
  11: "Expression",
  21: "Vibrato",
};

const standardCcNames: Record<number, string> = {
  0: "Bank Select",
  1: "Modulation Wheel",
  2: "Breath Controller",
  4: "Foot Controller",
  5: "Portamento Time",
  6: "Data Entry MSB",
  7: "Channel Volume",
  8: "Balance",
  10: "Pan",
  11: "Expression Controller",
  12: "Effect Control 1",
  13: "Effect Control 2",
  16: "General Purpose 1",
  17: "General Purpose 2",
  18: "General Purpose 3",
  19: "General Purpose 4",
  64: "Sustain Pedal",
  65: "Portamento On/Off",
  66: "Sostenuto",
  67: "Soft Pedal",
  68: "Legato Footswitch",
  69: "Hold 2",
  70: "Sound Variation",
  71: "Timbre",
  72: "Release Time",
  73: "Attack Time",
  74: "Brightness",
  75: "Decay Time",
  76: "Vibrato Rate",
  77: "Vibrato Depth",
  78: "Vibrato Delay",
  79: "Sound Controller 10",
  80: "General Purpose 5",
  81: "General Purpose 6",
  82: "General Purpose 7",
  83: "General Purpose 8",
  84: "Portamento Control",
  88: "High Resolution Velocity",
  91: "Reverb Depth",
  92: "Tremolo Depth",
  93: "Chorus Depth",
  94: "Detune Depth",
  95: "Phaser Depth",
  96: "Data Increment",
  97: "Data Decrement",
  98: "NRPN LSB",
  99: "NRPN MSB",
  100: "RPN LSB",
  101: "RPN MSB",
  120: "All Sound Off",
  121: "Reset All Controllers",
  122: "Local Control",
  123: "All Notes Off",
  124: "Omni Off",
  125: "Omni On",
  126: "Mono On",
  127: "Poly On",
};

/** Built-in channel assignments, in channel order. */
export const defaultMidiCcNumbers = [1, 11, 2, 21, 7, 16, 17, 18];

export function getCcName(cc: number): string {
  if (orchestralCcNames[cc] !== undefined) return orchestralCcNames[cc];
  if (standardCcNames[cc] !== undefined) return standardCcNames[cc];
  // CC32-63 are the LSBs for CC0-31.
  if (cc >= 32 && cc <= 63) return `LSB ${cc - 32}`;
  return `CC${cc}`;
}
