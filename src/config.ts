import { defaultJogOptions } from "./midi/JogController";
import { debugLogsEnabled } from "./logger";

export const jogOptions = {
  ...defaultJogOptions,
  // Jog gesture diagnostics: on in `npm run build:dev`; set to true to force on.
  diagnostics: debugLogsEnabled,
  traceValues: false,
};

