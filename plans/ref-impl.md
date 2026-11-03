# MIDI Remote Direct Access Reference Notes

Updated: 2026-10-24

## Scope and Evidence

The unpacked reference directory supplied for this analysis contained both `Test_scrubShuttle.js` (the host-side MIDI Remote driver) and `scrubShuttle.html` (the browser test surface). Both files were inspected and have since been deleted after confirming the behavior; this document preserves the findings. Earlier notes inspected only the HTML embedded in the `.midiremote` package and therefore missed the actual driver. This document supersedes that earlier incomplete comparison.

The files were supplied from `/mnt/c/Users/woodc/OneDrive/Documents/Steinberg/Cubase/MIDI Remote/Driver Scripts/Local/Test/scrubShuttle/`; that directory is now empty. The related sources were:

- The [Scrub and Shuttle forum post](https://forums.steinberg.net/t/scrub-and-shuttle-using-midi-remote/1038226/) describes the Direct Access approach and links the `.midiremote` package.
- The package contains an HTML/Web MIDI test surface and a host-side MIDI Remote script. The unpacked versions are `scrubShuttle.html` and `Test_scrubShuttle.js` in the directory above.
- The linked [Test_Scrub and Shuttle attachment](https://forums.steinberg.net/uploads/short-url/l4XWilhHVx7pLCaPtjTVz876T4X.midiremote) is the packaged form of these example assets.
- The [official DirectAccess documentation](https://steinbergmedia.github.io/midiremote_api_doc/advanced-topics/direct-access/) documents the API mechanics, not Cubase's jog and shuttle parameter semantics.

The host-side behavior below is read directly from `Test_scrubShuttle.js`; it is code analysis, not independent runtime verification in Cubase. The HTML is a separate protocol/UI reference.

## Scrub and Shuttle Forum Example

The post's motivation is that Transport > Jog Left/Right and Shuttle Play commands do not reproduce keyboard key-down behavior reliably through MIDI Remote. `makeRepeating()` can approximate repetition but still has interruptions. The author reports using Direct Access to control the host jog and shuttle values directly to avoid interruptions and unpredictable direction changes.

The attached test surface provides this MIDI protocol on channel 1 (zero-based MIDI channel 0):

| Function | Message | Behavior in the test surface |
| --- | --- | --- |
| Jog wheel | CC 60 | Relative signed-bit: clockwise sends magnitude 1-63; counterclockwise sends 64 + magnitude. Pointer motion is quantized into three-degree steps; wheel input sends one tick. |
| Scrub enable | Note 101 | Note-on value 127 enables Scrub; value 0 disables it. The HTML button toggles this state. |
| Shuttle speed | CC 61 | Absolute selector with fifteen positions from reverse 8x through Stop at 64 to forward 8x. |
| Shuttle return | CC 62 | Value 127 enables spring return; 0 disables it. With spring return enabled, releasing the HTML shuttle knob sends the center/Stop value. |

The test surface's Shuttle CC values are `0, 9, 18, 27, 36, 45, 54, 64, 73, 82, 91, 100, 109, 118, 127`, ordered from reverse 8x to forward 8x. The HTML jog wheel itself has no host parameter handling: it generates CC 60, and the scrub button sends Note 101. Its pointer-up handling releases pointer capture but does not send an additional jog or stop message.

The post also says that the installed script folder contains an HTML surface for demonstrating and testing the script. The HTML explains the MIDI protocol; the host-side behavior is in `Test_scrubShuttle.js`.

### Host-Side JavaScript

`Test_scrubShuttle.js` constructs a MIDI Remote driver with a MIDI input/output and a detection unit hard-coded to `loopMIDI Port` / `loopMIDI Port 1`. It creates a relative-signed-bit knob bound to CC 60, a lamp bound to Note 101, and an absolute shuttle knob bound to CC 61. The page has two subpages, `Jog` and `Scrub`; Note 101 activates the other subpage. In Jog mode, CC 60 drives Transport Nudge Left/Right command bindings. In Scrub mode, the same CC 60 value binding writes directly to transport parameter 4044.

The Scrub callback reads the relative knob `value` and `diff`. If `value` is below 0.10 or above 0.90, it recenters only the knob's local process value according to the diff direction and returns without writing a host parameter. Otherwise it writes `value` to transport tag 4044 using `setParameterProcessValue`. The script defines tag 4041 (`jogActive`) for polling, but does not write it. Thus the reference algorithm is the same broad local-rebase pattern described in the earlier workspace notes; the actual source confirms it, while also showing that the host scrub control is explicitly separated onto its own subpage.

Shuttle uses absolute CC 61 process values, converted back to MIDI values with `Math.round(value * 127)`. A lookup maps fifteen discrete values (including center/Stop at 64) to fourteen native speed tags plus a no-tag Stop entry. When a new value arrives, it releases the currently selected speed tag with value 0, stores the newly selected tag, and schedules a value-1 write after two `mOnIdle` callbacks. The Stop entry stores tag `-1` and schedules no start, so moving to center releases the previous speed. The script has no inactivity timeout; spring return is implemented by the HTML test surface sending center on pointer release when enabled.

The code has several limitations worth retaining in any port or follow-up test:

- It creates `daTransport` but does not call `activate()` or `deactivate()`. The current official Direct Access guide says those lifecycle calls are required. This may be an omission in the example or a version-specific behavior; test it rather than copying it.
- It resolves the base transport `ObjectID` on each write, which avoids retaining one ID, but it does not check for a negative/invalid ID, required tag availability, transport replacement, or `mOnObjectWillBeRemoved`.
- It polls all entries in `hostParams` every ten idle callbacks. That table includes the Stop sentinel with tag `-1`; the API's behavior for querying that sentinel is not documented by the example.
- Each Shuttle value callback releases the current non-Stop tag before scheduling a start, even if the selected tag is unchanged. There is no explicit same-speed suppression; the shared pending tag and idle counter coalesce toward the latest selection, but that behavior is not tested here.
- `shuttleSpringSwitch` is bound as a lamp to CC 62, but the host script does not read its state or use it to control shuttle behavior. The HTML implements spring-return behavior by sending CC 61 center itself.
- The host script has no recording, transport-takeover, page-deactivation, or project-replacement cleanup path for a held shuttle tag.

## Direct Access API Notes

The [DirectAccess guide](https://steinbergmedia.github.io/midiremote_api_doc/advanced-topics/direct-access/) and [API reference](https://steinbergmedia.github.io/midiremote_api_doc/codedoc_api_reference#hostobjectdirectaccess) establish this general pattern:

1. Create a `HostObjectDirectAccess` from a host object, for example `page.mHostAccess.makeDirectAccess(page.mHostAccess.mTransport)`.
2. Activate it with the current mapping in the page activation callback and deactivate it on page deactivation. Direct Access is documented as an API 1.2+ feature.
3. Resolve runtime `ObjectID` values from the active mapping. Enumerate child objects and parameters instead of assuming that runtime object IDs are stable.
4. Enumerate parameter tags with `getNumberOfParameters` and `getParameterTagByIndex`. Read metadata and values with methods such as `getParameterTitle`, `getParameterProcessValue`, `getParameterDisplayValue`, and `getParameterProcessValueType`.
5. Write process values with `setParameterProcessValue`. Process values and display values are distinct; use the conversion methods where a plain/process conversion is needed.
6. Use `mOnParameterChange`, `mOnObjectChange`, and `mOnObjectWillBeRemoved` for updates and invalidation. Re-resolve or invalidate cached IDs when the host object changes or is removed.

The documentation is useful for the access and lifecycle mechanics, but it does not provide a transport-tag catalogue or define the user-visible behavior of the jog/shuttle tags. In particular, the guide does not explain the semantics, valid ranges, state transitions, or timing guarantees for tags 4041, 4044, or 2000-2013. Those details must be discovered and verified in the target Cubase version; a displayed value alone does not establish how a transport parameter behaves.

The API 1.3 [HTML-based MIDI Remote forum thread](https://forums.steinberg.net/t/an-html-based-midi-remote-demonstrating-additions-in-mr-api-1-3/1029450/) is broader context. Its author describes Direct Access as a way to reach objects not exposed through the earlier high-level API and demonstrates plugin-oriented features alongside an HTML command browser. It is not a jog-specific recipe. The linked [Test_Plugin HTML Browser attachment](https://forums.steinberg.net/uploads/short-url/8I1Z5qlYUCjJ9BMyDx3KGSliu2c.midiremote) is not evidence for scrub or shuttle behavior.

## Comparison with Icon Platform M+

| Area | Forum reference/test surface | Local implementation |
| --- | --- | --- |
| Nudge | CC 60 drives Nudge Left/Right command bindings on the `Jog` subpage. | Nudge uses Cubase's jog-left/right surface values and command bindings in [master_controls.ts](../src/master_controls.ts). |
| Scrub input | Relative signed-bit CC 60; Note 101 switches between `Jog` and `Scrub` subpages. | CC 60 is shared across modes; wheel push cycles Nudge, Scrub, and Shuttle. |
| Scrub host access | On the `Scrub` subpage, the value binding writes in-range relative process values to tag 4044 and only recenters the local input below 0.10 or above 0.90. It does not write tag 4041. | [jog.ts](../src/midi/jog.ts) creates Direct Access on `mTransport`, probes tags 4041/4044, and writes Scrub values to 4044. Its active `relative-rebase` strategy also recenters local input at edges and does not explicitly write 4041 during cleanup. |
| Shuttle input | Absolute CC 61 maps fifteen values including Stop to the native forward/reverse speed tags. CC 62 is present as a lamp input, but the host code does not consume it. | CC 60 direction advances or decrements one position in the absolute selector; tick magnitude is ignored. Clockwise increases speed, counterclockwise decreases through Stop into reverse. |
| Shuttle transitions | On each CC 61 change, release the previous tag, then start the selected tag after two idle callbacks. The host code has no timeout; the HTML can send center/Stop on pointer release. | The local selector starts at Stop, releases the old tag before changing, waits two idle callbacks, and latches the selected speed through inactivity. Selecting Stop or leaving Shuttle releases it and resets the selector. |
| Lifecycle and safety | No Direct Access activation/deactivation, object-removal handling, tag validation, recording protection, takeover cleanup, or transport replacement guard is visible in this source. | Local code activates/deactivates Direct Access, validates tags, checks transport identity, and handles recording/takeover/deactivation. Its mocked tests still cannot prove Cubase audio/cursor behavior. |

## Implementation Takeaways

- Keep Direct Access for Scrub and native Shuttle speed control; retain command bindings only where they remain intentional, such as Nudge.
- Treat the HTML as a MIDI protocol/UI reference and the unpacked JS as the host-side implementation reference. Do not copy its separate CC 61/62 control model onto the Platform M+ without a hardware control that actually emits those messages.
- The shared Scrub pattern is relative signed-bit CC 60 plus local input recentering and Direct Access writes to 4044. The local implementation adds tag validation and lifecycle/ownership safeguards that are absent from the reference source.
- The reference's two-idle-cycle Shuttle transition is a useful baseline. The local controller preserves that settling delay, advances only one selector position per wheel event, latches through inactivity, and releases/reset on mode exit or safety takeover.
- Do not copy the reference's missing Direct Access lifecycle calls or its polling of the `-1` Stop sentinel without verifying these behaviors in the target Cubase version.
- Continue resolving runtime object IDs and checking for required tags. Do not hard-code an observed object ID or infer undocumented parameter behavior from its title/display value.
- Keep Cubase runtime verification separate from mocked callback/write-order tests. For Scrub, record 4044 process values, 4041 changes, cursor position, and transport feedback around each suspected skip. For Shuttle, verify native flag release, direction changes, recording, takeover, mode switches, and reconnect in Cubase.
- The supplied host implementation was inspected before deletion; earlier uncertainty about its algorithm is resolved. Cubase runtime behavior and the reason its Direct Access instance omits documented activation/deactivation remain unverified.

## Reference Links

- [Scrub and Shuttle using MIDI Remote forum post](https://forums.steinberg.net/t/scrub-and-shuttle-using-midi-remote/1038226/)
- [Test_Scrub and Shuttle MIDI Remote attachment](https://forums.steinberg.net/uploads/short-url/l4XWilhHVx7pLCaPtjTVz876T4X.midiremote)
- Unpacked sources analyzed before deletion: `Test_scrubShuttle.js` (host implementation) and `scrubShuttle.html` (browser test surface), supplied from the directory noted above.
- [Official DirectAccess guide](https://steinbergmedia.github.io/midiremote_api_doc/advanced-topics/direct-access/)
- [HostObjectDirectAccess API reference](https://steinbergmedia.github.io/midiremote_api_doc/codedoc_api_reference#hostobjectdirectaccess)
- [API 1.3 HTML-based MIDI Remote forum post](https://forums.steinberg.net/t/an-html-based-midi-remote-demonstrating-additions-in-mr-api-1-3/1029450/)
- [Test_Plugin HTML Browser MIDI Remote attachment](https://forums.steinberg.net/uploads/short-url/8I1Z5qlYUCjJ9BMyDx3KGSliu2c.midiremote)
