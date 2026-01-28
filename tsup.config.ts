import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/bfw_platformmplussd.ts"],
    outDir: "dist/bfw/platformmplussd",
    clean: true,
    external: ["midiremote_api_v1"],
    noExternal: ["abbreviate", "core-js", "color-diff"],
    target: "es5",
  }
);
