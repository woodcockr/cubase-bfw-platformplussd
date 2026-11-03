// Platform M+ MIDI CC page configuration
//
// Edit ONLY the lines between "BEGIN MIDI CC CONFIG" and "END MIDI CC CONFIG".
// Each line sets one fader channel, in order (channel 1 first, up to 8 lines):
//
//     "<CC number>, <optional name>",
//
//   - CC number: a whole number from 0 to 127.
//   - Name: optional. Leave it blank (e.g. "16,") to use the standard name.
//     Use plain letters, digits and punctuation, no commas. Long names are
//     abbreviated to fit the 6-character LCD.
//   - Keep the double quotes and the comma at the end of each line.
//   - Rows whose text starts with # are ignored, e.g. "# 64, Sustain",
//   - If there are fewer than 8 lines, the remaining channels use the defaults.
//
// If anything in this file is wrong, the driver uses the built-in defaults
// below and writes an error starting with "[MIDI CC config]" to the
// MIDI Remote script console. Reload the script (or restart Cubase) after
// editing.

module.exports = { rows: [
  // BEGIN MIDI CC CONFIG
  "1, Dynamics",
  "11, Expression",
  "2, Breath",
  "21, Vibrato",
  "7, Volume",
  "16,",
  "17,",
  "18,",
  // END MIDI CC CONFIG
]};
