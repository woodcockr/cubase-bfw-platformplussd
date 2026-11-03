# Jog and Shuttle Plan

Updated: 2026-10-24

## Goals

- Keep the jog implementation on Direct Access; native command bindings are not the desired final Scrub implementation.
- Find a reliable way to scrub continuously without backward skips.
- Change Shuttle from momentary to latched playback speed with an intentional stop/unlatch action.
- Investigate whether Cubase supports an ordinary MCU Jog mode that moves the project cursor without audio scrubbing. Playback was reportedly optional for MCU Jog unless Scrub was enabled in material the user was reading. Treat this as an open Cubase/API feasibility question, not an established feature.

## Current Implementation

- Wheel push cycles Nudge (`N`) -> Scrub (`S`) -> Shuttle (`H`); startup selects Nudge.
- Nudge uses Transport Nudge Cursor Left/Right commands.
- Scrub uses one relative signed-bit CC60 binding to the actual encoder `mEncoderValue`; Nudge and Shuttle consume its signed difference, and Scrub writes the relative ValueBinding's in-range value to transport parameter 4044. At local values below 0.1 or above 0.9, only the encoder's local value is recentered. Scrub cleanup does not write jogActive tag 4041, following the reference implementation. The bounded alternative has been removed; the remaining Scrub behavior is unchanged.
- Shuttle starts at the center Stop selector position. Each clockwise CC60 event advances one absolute selector slot toward forward 8x; each counterclockwise event decrements one slot through Stop and toward reverse 8x. Tick magnitude does not skip speed slots. The selected native speed remains latched through inactivity; selecting Stop or exiting Shuttle releases the held flag. Shuttle exit resets its selector to Stop.
- The reference package uses relative signed-bit CC60 for Scrub and separate absolute CC61/CC62 controls for Shuttle/spring return; Platform M+ uses CC60 and push Note 101 instead.
- Current working tree contains uncommitted changes. Do not reset or discard them.

## Findings

- Raw hardware capture confirms signed-bit direction encoding: tested clockwise values were 1-7; counterclockwise values were 65-71. The old source comment claiming an offset of 50 was stale. Direction decoding is not currently the leading suspect.
- Magnitudes rise with turn speed, but captured histograms do not include event timing.
- Direct Access tag 4044 is titled `Jog`; observed process values are normalized 0-1 and display values scale to 0-1000. Its exact host semantics remain undocumented.
- Tag 4041 is `Jog Active`. Reference Scrub does not write it; current relative mode also avoids explicit 4041-off cleanup.
- User reports the reference Scrub implementation also skips and considers the retained relative Scrub behavior usable. The bounded alternative has been removed.
- “Return to Start Position on Stop” was disabled during a skip, ruling that preference out for that test. The Cubase Stop button often flashes, but that alone does not establish that the script sent Stop.
- Current validation baseline: `npm run test:jog` has 50 tests; all pass after replacing bounded-Scrub and momentary-Shuttle expectations. `npm run build` targets ES5. `npm run tsc -- --pretty false` still reports four pre-existing errors (two implicit-any callback parameters in `bfw_platformplussd.ts`, missing `abbreviate` declaration, and possible undefined device in `midi/binding.ts`).

## Scrub Investigation

1. In a disposable project, confirm the installed build reports `Direct Access Scrub ready (single CC60 relative binding)`.
2. Test short single-direction turns, pauses, reversals, and crossing each local rebase point. Observe the actual timeline/time display as well as the Play/Stop indicator.
3. With a short `traceValues` capture, correlate skips with the 4044 process-value sequence, local `rebases` count, and any 4041 change. Current end-of-gesture summary includes strategy, forward/reverse tick counts, peak delta, rebase count, position, and boundary.
4. The reference implementation has also been observed to skip. An A/B on the same Cubase build/controller may still help isolate version or host interactions.
5. Do not add another wrap/reset or change Scrub behavior without a specific hypothesis and an audio/cursor test. Mock tests validate callback/write ordering, not Cubase's transport semantics.
6. Investigate the possible third mode: ordinary MCU Jog with audio playback optional, distinct from Scrub. Find the source/reference and determine whether Cubase exposes separate host controls or flags for Jog versus Scrub, how playback state is managed, and whether this should be a separate page/submode alongside Nudge/Scrub.

## Shuttle Selector Follow-up

1. Implemented: Shuttle starts at Stop; clockwise advances and counterclockwise decrements one selector position per nonzero wheel event, independent of CC60 magnitude.
2. Implemented: forward and reverse speed tags range from 1/8x through 8x, with Stop between them. Speed transitions release the old flag, wait two idle callbacks, then start the latest selection.
3. Implemented: speed remains latched through inactivity; selecting Stop or leaving Shuttle releases the active flag. Mode changes, transport/Zoom takeover, recording, deactivation, and transport replacement cancel pending/owned state.
4. `npm run test:jog` covers selector order, Stop crossing, latching, mode exit, recording/takeover cleanup, and cancellation. Verify the actual speed sequence and safety cases in Cubase.

## Constraints and Safety

- Keep Direct Access as the target architecture; do not silently replace Scrub with Jog Left/Right commands.
- Platform M+ has CC60 and Note 101 for the jog wheel/push; it does not expose the reference's separate absolute CC61 shuttle selector and CC62 spring-return control. The local selector steps on CC60.
- Do not assume the reference's behavior transfers exactly across Cubase versions. Verify cursor position and transport feedback in Cubase after each meaningful change.
