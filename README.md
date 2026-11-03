To build:
---------

Install required node packages:
`npm install`


Usage:
------

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for a complete guide to all pages, buttons, and faders on the Icon Platform M+.

### MIDI CC configuration

The MIDI CC page channel assignments are read from `midi-cc-config.js`, which
is installed beside `bfw_platformmplussd.js` in the driver folder
(`MIDI Remote/Driver Scripts/Local/bfw/platformmplussd/`). Open it in any text
editor and change only the lines between `BEGIN MIDI CC CONFIG` and
`END MIDI CC CONFIG`. Each line is one channel, in order:

```
  "1, Dynamics",
  "11, Expression",
  "16,",
```

- CC number `0`–`127`, then an optional name (blank uses the standard name).
- Up to 8 lines; missing channels use the defaults.
- Rows starting with `#` are ignored.

Built-in defaults: CC1 Dynamics, CC11 Expression, CC2 Breath, CC21 Vibrato,
CC7 Volume, CC16, CC17, CC18 (General Purpose 1–3).

If the file is missing or contains any error, the driver still loads, uses the
complete built-in defaults, and writes messages starting with
`[MIDI CC config]` to the MIDI Remote script console. Reload the script or
restart Cubase after editing. When upgrading, keep a copy of your edited
`midi-cc-config.js` and copy it back over the newly installed one.

The source of the shipped file is [src/midi-cc-config.js](src/midi-cc-config.js);
`npm run build` copies it into `dist/bfw/platformmplussd/`. Run
`npm run test:midi-cc` for the parser tests.


Architecture:
--------------

The binding system uses a config-driven approach via `BindingCreator` and declarative configs in `src/config/subpages/`.
Unused surface elements are automatically bound to dummy values via `dummyBindings` in the config.
This pattern is applied to all subpages including Selected Track (SendsQC, EQ, CueSends, PreFilter) and Channel Strip effects.

Development:
------------

### Script console logging

All script output goes through [src/logger.ts](src/logger.ts):

- **Debug**: development tracing (binding creation, LCD writes, display state,
  page activation, jog diagnostics). Printed only by a development build.
- **Info**: brief startup status (driver activated, MIDI CC config loaded,
  Direct Access jog ready).
- **Warning / Error**: problems such as an invalid `midi-cc-config.js`,
  unavailable Direct Access parameters, or binding configuration errors.

| Command | Output |
|---|---|
| `npm run build` | Release build: info, warnings and errors only |
| `npm run build:dev` | Development build: also prints debug logs |
| `npm run start` / `npm run start:dev` | Watch-mode equivalents |

The flag is the build-time constant `__BFW_DEBUG_LOGS__` (set in
[tsup.config.ts](tsup.config.ts)). In frequently called code, guard debug calls
with `if (debugLogsEnabled)` so release builds skip building the message.
Run `npm run test:logger` for the logger tests.

See [DUKTAPE_COMPATIBILITY.md](DUKTAPE_COMPATIBILITY.md) for important compatibility notes about Cubase's JavaScript engine (Duktape) and known workarounds for common issues.

See [BINDING_CONFIG_REFERENCE.md](BINDING_CONFIG_REFERENCE.md) for documentation on the binding configuration system.

See [STREAMDECK_INTEGRATION.md](STREAMDECK_INTEGRATION.md) for documentation on integrating with Elgato Stream Deck using the MIDI plugin.

### Direct Access Jog Development (Cubase 15)

The wheel has three tap-cycled modes: Nudge (`N`), Scrub (`S`), Shuttle (`H`),
then back to Nudge. Activation always starts in Nudge. Nudge keeps its existing
commands; Scrub and Shuttle use separate Direct Access transport parameters.

Scrub uses Direct Access transport parameter 4044. Raw CC60 capture confirmed
signed-bit encoding for the tested rates: clockwise `1-7`, counterclockwise
`65-71`. The previous comment claiming a reverse offset of 50 was stale.

Scrub uses one relative signed-bit CC60 binding to the actual encoder value.
Nudge and Shuttle consume its signed delta; Scrub writes through a Scrub-scoped
ValueBinding and recenters only the local encoder value below 0.1 or above 0.9.
The separate bounded Scrub strategy has been removed. The user reports that this
Scrub behavior is usable; Cubase skip behavior remains a runtime caveat.

Shuttle is a latched absolute speed selector controlled by relative CC60 ticks.
It enters at Stop; each clockwise tick advances one forward speed regardless of
tick magnitude, and each counterclockwise tick moves one selector position back
through Stop into reverse speeds. The selected native speed remains active until
another position is selected or Shuttle is exited. Leaving Shuttle releases the
owned speed flag and resets the selector to Stop. Recording, mode/transport
takeover, and reconnect behavior still require Cubase runtime verification.

Jog diagnostics are in [src/config.ts](src/config.ts), under `jogOptions`:

- `idleTimeoutMs`: inactivity before ending a Scrub gesture (default `200 ms`); Shuttle remains latched through inactivity.
- `diagnostics`: log startup metadata and one summary when each Scrub or Shuttle gesture ends (on in `npm run build:dev`, off in `npm run build`; set to `true` to force on).
- `traceValues`: additionally log wheel ticks, Nudge routing, Shuttle selector positions/native-tag writes, and Direct Access parameter changes (default `false`; enable only for short captures).

Run `npm run test:jog` for controller and mocked MIDI Remote integration tests,
then `npm run build` to produce the driver. These tests cannot verify audio or
Duktape behavior; test the built script in Cubase before relying on it.

For a Cubase probe, build with `npm run build:dev` (enables `diagnostics`) and install the driver:

1. Activate the driver and confirm the console says
    `Direct Access Scrub ready (single CC60 relative binding)`.
2. With hardware Zoom lights off, test short slow turns in both directions,
    then faster turns and crossings of both local recenter points. Capture the
    `Jog ended` summary for any skip; `rebases` counts local edge recentering.
3. Note whether the cursor skips during rotation, exactly at a rebase, or when
    turning stops. The captured raw bytes confirm normal signed-bit direction, so
    the remaining investigation is the host-value transition and release behavior.

Scrub does not explicitly write jogActive tag 4041 during cleanup, matching the
reference example. If a skip occurs, record direction counts, rebase count, and
whether it occurs during movement, at a rebase, or at release.

Tag 4044 is a bounded jog position, not a playback-speed value. Startup reads its
current value rather than assuming it is centred. The script never resets this
position, even with jog inactive: the gated-reset experiment also caused jumps
and has been rejected. Scrub does not write tag 4041 or issue Transport Stop
during cleanup. The reference implementation also skips; the user considers the
current relative Scrub usable. Missing either required tag disables Scrub.

Repeated notifications for the same transport object are ignored: they no longer
re-probe metadata or cancel the scrub stop timer. With `traceValues: false`, the
jog logger remains quiet when idle. After each gesture, capture the final
`Jog ended: ticks=... fwd=... rev=... peak=... rebases=... pos=...`
line and report whether a skip occurred during rotation or at release. `fwd` and
`rev` count decoded directions. Shuttle's runtime speed-selector behavior still
needs verification in Cubase; the remaining safety checks are listed below.

### Shuttle Mode (Experimental)

Tap twice from startup Nudge to select Shuttle (`H`). Keep the hardware Zoom
lights off so the wheel sends its normal CC60 movement messages. Unlike Scrub,
Shuttle never writes tag 4044 and is not limited by the Scrub parameter boundary.
The selector starts at Stop. Each nonzero clockwise CC60 event advances exactly
one position toward forward 8x; each counterclockwise event moves one position
toward reverse 8x. CC60 magnitude does not select the speed and does not skip
selector positions. The scale is:

| Selector position | Speed | Forward Tag | Reverse Tag |
| --- | --- | --- | --- |
| 1 step from Stop | 1/8x | 2010 | 2013 |
| 2 steps | 1/4x | 2009 | 2012 |
| 3 steps | 1/2x | 2008 | 2011 |
| 4 steps | 1x | 2000 | 2004 |
| 5 steps | 2x | 2001 | 2005 |
| 6 steps | 4x | 2002 | 2006 |
| 7 steps | 8x | 2003 | 2007 |

Each speed is a held native flag: `1` starts it and `0` releases it. Changes
release the old flag, wait two page-idle callbacks, then start the latest selected
speed. Stop is the center selector position; reaching it releases the active
speed and schedules no new flag. Speeds stay latched through wheel inactivity.
Physical transport/Zoom takeover, mode changes, recording start, page deactivation,
or transport replacement cancel pending work and release an owned flag. Leaving
Shuttle always resets the selector to Stop. While recording, wheel input cannot
start a new speed.

All 14 speed tags must be present for Shuttle to enable. Its availability is
independent of Scrub. Check for `Direct Access Shuttle ready` or the corresponding
disabled message on activation. With diagnostics enabled, each gesture produces
one `Shuttle ended: ticks=... fwd=... rev=... peak=...` summary.

Runtime status: the prior momentary Shuttle was tested; the new latched selector
has not yet been verified in Cubase. Recording, takeover, reload/reconnect, and
the post-Shuttle Scrub regression check remain unverified.

Initial runtime check in a disposable audio project:

1. Confirm startup `N`, first tap `S`, second tap `H`, next tap `N`.
2. In `H`, confirm the initial selector is Stop. Turn clockwise one detent at a
    time through forward speeds; turn counterclockwise back through Stop and into
    reverse. Compare slow and fast wheel turns to confirm each message moves one
    selector position regardless of magnitude.
3. Pause at a selected speed and confirm it remains latched. Return to Stop and
    confirm playback stops; then leave Shuttle and confirm the speed clears.
4. While moving, try physical Stop, Play, Zoom/Nav takeover, and a mode change.
    Confirm no delayed restart occurs. Check recording safety using the Cubase UI
    and hardware Record button, then test project reload and controller reconnect.
5. Return to `S` and confirm the verified unit-step, no-skip behavior is unchanged.

Native speed flags, their release behavior, and the two-idle settling gap are
based on the forum example rather than a documented timing guarantee. Mock tests
verify selector order, write ordering and cancellation, not actual Cubase audio
behavior.

TODO:
-----
- [] SD buttons show full track and value details
- [x] Release action
- [] Anything else for the Shift Page?
- [] Ch strip: Would be helpful if status lights or sd buttons displayed whether the selected strip module was loaded, active or bypassed


Known Issues:
------------
# Activate plugin doesn't work on channel strips

# Midi remote cached json file breaks update to script (as does Cubase itself)
A cached settings file exists here for midi remote configuration when surfaces are added. If things get lost this can be incorrect even if the surface is deleted and re-added with the new javascript file.

** Delete this if things get weird **
C:\Users\<user>>\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\User Settings\bfc_platformplussd_...json

Full clean removal/reinstall (seems to work most of the time):
1. Load Project that is impacted
2. Remove control surface and any shadow ones.
3. Save Project and Quit Cubase
4. Delete file: C:\Users\<user>>\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\User Settings\bfc_platformplussd_...json
5. Rename the driver script in C:\Users\<user>>\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\Driver Scripts\Local\bfw\platformmplussd from bfw_platformmplussd.js to bfw_platformmplussd.old
6. Start Cubase
7. Load Project - there should be no Platform plus SD midi remote
8. Save Project
9. Quit Cubase
10. Add updated (or rename old) driver script to folder in 5
11. Start Cubase
12. Load Project
13. There should at this stage be NO platform plus SD midi remotes (if there are then repeat the steps)
14. Add the control surface again in Midi remote.

Why is this so? I have no idea. Cubase appears to store midi remote information in the project, in User Settings and in the Driver - and the Driver appears to be the last thing to be checked if the other things exist!

