# Project Guidelines

Cubase MIDI Remote driver for the Icon Platform M+ with Stream Deck. TypeScript is bundled by tsup into a single ES5 script that runs in Cubase's Duktape engine.

## Build and Test

```sh
npm install            # also applies patches/ via patch-package
npm run build          # release bundle: warnings/errors + startup status only
npm run build:dev      # same, with development (debug) logs enabled
npm run test:jog && npm run test:midi-cc && npm run test:logger
npx tsc --noEmit       # type check only
```

- Output: `dist/bfw/platformmplussd/bfw_platformmplussd.js` plus a copy of `src/midi-cc-config.js`. The folder layout matches Cubase's `Driver Scripts/Local/` tree.
- `tsc` needs the Cubase API typings in `.api/v1/` (gitignored). Copy them from Cubase's `MIDI Remote/Driver Scripts/.api/v1`. The build does not need them, because `midiremote_api_v1` is external.
- `tsc` reports 4 errors that already exist (`bfw_platformmplussd.ts` implicit any, `abbreviate` typings, `binding.ts` possibly-undefined). Don't add new ones.
- Tests are `node --test` CommonJS files in `tests/` that load bundled or transpiled code into a `vm` context. Any new vm context must define `__BFW_DEBUG_LOGS__`.
- Real behaviour can only be verified in Cubase. Ask the user to test hardware-facing changes, and look for problems in the MIDI Remote Script Console.

## Architecture

- `src/bfw_platformmplussd.ts`: entry point. Creates the driver, devices and pages, and wires the Stream Deck page buttons.
- `src/config/`: declarative binding system. Subpages are declared in `subpages/*.config.ts` and created by `bindingCreator.ts`. See [BINDING_CONFIG_REFERENCE.md](BINDING_CONFIG_REFERENCE.md).
- `src/midi/`: hardware layer: ports, LCD (`LcdManager`, `DisplayStateManager`), jog wheel (`JogController`, `jog.ts`) and MIDI CC config parsing. See [DISPLAY_STATE_MANAGEMENT.md](DISPLAY_STATE_MANAGEMENT.md) and [STREAMDECK_INTEGRATION.md](STREAMDECK_INTEGRATION.md).
- Page modules: `mixer.ts`, `channel_strip.ts`, `selected_track.ts`, `control_room.ts`, `midi.ts`, `shift.ts`, `master_controls.ts`.
- User-facing behaviour is documented in [README.md](README.md) and [QUICK_REFERENCE.md](QUICK_REFERENCE.md). Update them when controls change.

## Conventions

- **Duktape/ES5 runtime:** never store and later `.call`/`.apply`/invoke Cubase API handlers such as `mOnActivate`; inline the logic instead. Read [DUKTAPE_COMPATIBILITY.md](DUKTAPE_COMPATIBILITY.md) before touching API callbacks.
- **Logging:** use `src/logger.ts` (`logDebug`, `logInfo`, `logWarning`, `logError`), not `console.log`.
  - `logDebug` output only appears in `build:dev`, because `__BFW_DEBUG_LOGS__` is a build-time constant.
  - Guard hot paths with `if (debugLogsEnabled)`, because tsup does not strip the strings.
  - Release builds should print only one-line startup status, warnings and errors.
- **User-editable files shipped beside the driver** (for example `midi-cc-config.js`):
  - Load them with a relative `require("./name")`, and add them to tsup `external`.
  - Copy them into `dist` in `onSuccess`.
  - The file must assign `module.exports = {...}`. In Cubase, `exports.x = ...` loads as `{}`.
  - A missing file throws a catchable error. Catch it, fall back to defaults and log with a `[Feature]` prefix. Never let a bad user file stop the script loading.
  - The MIDI Remote API cannot write files, so persistence must go through such files or Cubase's own settings.
- **LCD:** each channel cell fits 7 characters (6 if you want a separating space). Shorten names with `LcdManager.abbreviateString` (and `stripNonAsciiCharacters`) in `src/midi/LcdManager.ts`, which uses the patched `abbreviate` package, rather than truncating ad hoc.
- **Releases:**
  - Bump with `npm version <x.y.z[-rcN]> --no-git-tag-version`.
  - Add a `CHANGELOG.md` section and `release-notes/v<version>.md`, which becomes the GitHub release body.
  - Merge to `main` via PR (the merge-commit style), then push a `v*` tag on `main`. `.github/workflows/release.yml` tests, zips and publishes. Tags containing `-` are marked as pre-releases.
