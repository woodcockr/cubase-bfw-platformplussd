/**
 * Script console logging.
 *
 * - `logDebug`: development tracing, only printed by `npm run build:dev`.
 *   In frequently called code, guard the call with `if (debugLogsEnabled)` so
 *   release builds do not build the message string either.
 * - `logInfo`: brief startup status, always printed.
 * - `logWarning` / `logError`: problems the user may need to act on, always printed.
 *
 * The MIDI Remote console only reliably supports `console.log`.
 */

export const debugLogsEnabled: boolean = __BFW_DEBUG_LOGS__;

export function logDebug(message: string) {
  if (__BFW_DEBUG_LOGS__) console.log(message);
}

export function logInfo(message: string) {
  console.log(message);
}

export function logWarning(message: string) {
  console.log("Warning: " + message);
}

export function logError(message: string) {
  console.log("Error: " + message);
}
