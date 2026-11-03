/**
 * Parsing and safe loading of the user-editable MIDI CC configuration file
 * (`midi-cc-config.js`), which is shipped beside the built driver.
 *
 * The file exports `{ rows: [...] }` where each row is a string of the form
 * `"<CC number>, <optional display name>"`. Any error causes the complete
 * built-in default configuration to be used.
 */

import { defaultMidiCcNumbers, getCcName } from "./CcNames";

export const midiCcConfigFileName = "midi-cc-config.js";
export const maxMidiCcRows = 8;

export interface MidiCcChannelConfig {
  cc: number;
  title: string;
}

export interface MidiCcParseResult {
  config: MidiCcChannelConfig[];
  errors: string[];
}

export function getDefaultMidiCcConfig(): MidiCcChannelConfig[] {
  return defaultMidiCcNumbers.map((cc) => ({ cc, title: getCcName(cc) }));
}

/**
 * Validates the exported configuration. Returns the complete configuration on
 * success, or every detected error and the complete defaults on failure.
 */
export function parseMidiCcConfig(exported: unknown): MidiCcParseResult {
  const defaults = getDefaultMidiCcConfig();

  if (
    exported === null ||
    typeof exported !== "object" ||
    !Array.isArray((exported as { rows?: unknown }).rows)
  ) {
    return {
      config: defaults,
      errors: ['the file must contain "module.exports = { rows: [ ... ] };"'],
    };
  }

  const rows = (exported as { rows: unknown[] }).rows;
  const errors: string[] = [];
  const parsed: MidiCcChannelConfig[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const label = `row ${index + 1}`;

    if (typeof row !== "string") {
      errors.push(`${label}: each row must be text in double quotes, e.g. "1, Dynamics"`);
      continue;
    }

    const text = row.trim();
    if (text === "" || text.charAt(0) === "#") continue;

    const commaIndex = text.indexOf(",");
    if (commaIndex < 0) {
      errors.push(`${label} "${row}": expected "<CC number>, <optional name>"`);
      continue;
    }

    const ccText = text.slice(0, commaIndex).trim();
    const name = text.slice(commaIndex + 1).trim();

    if (!/^\d{1,3}$/.test(ccText) || Number(ccText) > 127) {
      errors.push(`${label} "${row}": CC number must be a whole number from 0 to 127`);
      continue;
    }

    if (name.indexOf(",") >= 0) {
      errors.push(`${label} "${row}": name must not contain a comma`);
      continue;
    }

    if (!/^[\x20-\x7e]*$/.test(name)) {
      errors.push(`${label} "${row}": name must use plain ASCII letters, digits and punctuation`);
      continue;
    }

    const cc = Number(ccText);
    parsed.push({ cc, title: name === "" ? getCcName(cc) : name });
  }

  if (parsed.length > maxMidiCcRows) {
    errors.push(`${parsed.length} CC rows found; at most ${maxMidiCcRows} are allowed`);
  }

  if (errors.length > 0) {
    return { config: defaults, errors };
  }

  // Missing trailing rows use the built-in defaults for those channels.
  return {
    config: defaults.map((channelDefault, index) => parsed[index] ?? channelDefault),
    errors,
  };
}

/**
 * Returns the CC selected after one encoder detent. Only the direction of
 * `difference` is used, so each detent moves exactly one CC (clamped 0-127).
 */
export function stepCcNumber(current: number, difference: number): number {
  if (!isFinite(difference) || difference === 0) return current;
  return Math.max(0, Math.min(127, current + (difference > 0 ? 1 : -1)));
}

/** Name shown for a CC: the configured name when it is the configured CC. */
export function getDisplayTitle(channel: MidiCcChannelConfig, selectedCc: number): string {
  return selectedCc === channel.cc ? channel.title : getCcName(selectedCc);
}

/**
 * Loads and validates the configuration without ever throwing, so a broken
 * file cannot prevent the driver from loading.
 */
export function loadMidiCcConfig(
  loadModule: () => unknown,
  log: (message: string) => void
): MidiCcChannelConfig[] {
  const prefix = `[MIDI CC config] ${midiCcConfigFileName}:`;
  let exported: unknown;

  try {
    exported = loadModule();
  } catch (error) {
    log(`${prefix} ERROR could not load the file: ${String(error)}`);
    log(`${prefix} Using built-in MIDI CC defaults.`);
    return getDefaultMidiCcConfig();
  }

  const result = parseMidiCcConfig(exported);
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      log(`${prefix} ERROR ${error}`);
    }
    log(`${prefix} Using built-in MIDI CC defaults.`);
  } else {
    log(`${prefix} loaded ${result.config.map((channel) => `CC${channel.cc} ${channel.title}`).join(", ")}`);
  }

  return result.config;
}
