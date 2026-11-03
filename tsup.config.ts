import { copyFileSync } from "fs";
import { defineConfig } from "tsup";

const outDir = "dist/bfw/platformmplussd";

export default defineConfig((options) => {
  // `npm run build:dev` passes `--env.BFW_DEBUG_LOGS true` to keep development logs.
  const debugLogs = options.env?.BFW_DEBUG_LOGS === "true";

  return {
    entry: ["src/bfw_platformmplussd.ts"],
    outDir,
    clean: true,
    // midi-cc-config.js is user-editable, so it is shipped beside the bundle
    // and loaded at runtime instead of being bundled.
    external: ["midiremote_api_v1", "./midi-cc-config"],
    noExternal: ["abbreviate", "core-js", "color-diff"],
    target: "es5",
    define: {
      __BFW_DEBUG_LOGS__: JSON.stringify(debugLogs),
    },
    async onSuccess() {
      copyFileSync("src/midi-cc-config.js", `${outDir}/midi-cc-config.js`);
      console.log(`Development logs ${debugLogs ? "enabled" : "disabled"}`);
    },
  };
});
